import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  QlooTasteProvider,
  buildPlaceParams,
  diversify,
  clearQlooCache,
  cuisineOfTags,
  cuisineTag,
  parsePlaces,
  qlooConfigFromEnv,
} from "../src/taste/qloo-provider";
import { MockTasteProvider, ResilientTasteProvider, getTasteProvider, qlooConfigured, tasteSourceFor } from "../src/taste";
import type { TasteProfile } from "../src/taste";
import { CITY_OPTIONS, EXAMPLES, cityOf, toDemoPerson, userProfileSchema } from "../src/lib/profile";

// All fixtures below are INVENTED. No real Qloo data is stored in this repository.
const taste: TasteProfile = {
  likedCuisines: ["italian", "greek"],
  likedPlaces: [],
  likedDishes: ["pasta"],
  location: { lat: 40.7128, lon: -74.006 },
};

const entity = (over: Record<string, unknown> = {}, tagIds: string[] = ["urn:tag:genre:place:restaurant:italian"]) => ({
  name: "Test Trattoria",
  entity_id: "AAAA-0001",
  popularity: 0.9,
  query: { affinity: 0.95, distance: 1234 },
  properties: { address: "1 Example St", business_rating: 4.46, website: "https://example.test/", is_closed: false },
  tags: tagIds.map((id) => ({ id, name: id.split(":").pop() })),
  ...over,
});
const response = (...entities: unknown[]) => ({ success: true, results: { entities } });

function fakeFetch(body: unknown, status = 200) {
  return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }),
  ) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

const config = { apiKey: "test-key-not-real", baseUrl: "https://hackathon.example.test" };

beforeEach(() => clearQlooCache());
afterEach(() => vi.restoreAllMocks());

describe("settings", () => {
  it("trims the key (pasting can add a space) and the trailing slash, and defaults to the hackathon server", () => {
    expect(qlooConfigFromEnv({ QLOO_API_KEY: "  abc  ", QLOO_BASE_URL: "https://x.test///" })).toEqual({ apiKey: "abc", baseUrl: "https://x.test" });
    expect(qlooConfigFromEnv({ QLOO_API_KEY: "abc" })?.baseUrl).toBe("https://hackathon.api.qloo.com");
    expect(qlooConfigFromEnv({ QLOO_API_KEY: "   " })).toBeNull();
    expect(qlooConfigFromEnv({})).toBeNull();
  });

  it("uses the simulated provider when no key is set", () => {
    expect(qlooConfigured()).toBe(false);
    expect(getTasteProvider().simulated).toBe(true);
  });
});

describe("request parameters", () => {
  it("asks for restaurants near a POINT(lon lat) within 5 km, with favourite cuisines as signals", () => {
    const p = buildPlaceParams(taste, { take: 5 });
    expect(p.get("filter.type")).toBe("urn:entity:place");
    expect(p.get("filter.tags")).toBe("urn:tag:genre:place:restaurant");
    expect(p.get("signal.interests.tags")).toBe(`${cuisineTag("italian")},${cuisineTag("greek")}`);
    expect(p.get("filter.location")).toBe("POINT(-74.006 40.7128)");
    expect(p.get("filter.location.radius")).toBe("5000");
    expect(p.get("take")).toBe("5");
  });

  it("filters to one cuisine tag when a cuisine is asked for, and ignores unsupported liked cuisines", () => {
    const p = buildPlaceParams({ ...taste, likedCuisines: ["italian", "martian"] }, { cuisine: "greek", take: 3 });
    expect(p.get("filter.tags")).toBe(cuisineTag("greek"));
    expect(p.get("signal.interests.tags")).toBe(cuisineTag("italian"));
  });

  it("every city preset has a usable point, New York is the default", () => {
    expect(CITY_OPTIONS.map((c) => c.id)).toEqual(["new-york", "london", "chicago", "los-angeles", "toronto", "bucharest"]);
    expect(cityOf(undefined).id).toBe("new-york");
    expect(cityOf("not-a-city").id).toBe("new-york");
    for (const c of CITY_OPTIONS) expect(Math.abs(c.lat) <= 90 && Math.abs(c.lon) <= 180).toBe(true);
    expect(toDemoPerson({ ...EXAMPLES[0].profile, city: "bucharest" }).taste.location).toEqual({ lat: 44.4268, lon: 26.1025 });
    expect(toDemoPerson({ ...EXAMPLES[0].profile, city: undefined }).taste.location.lat).toBeCloseTo(40.7128, 3);
  });

  it("the profile accepts only the preset cities, and old saved profiles without a city still load", () => {
    const base = { name: "Rosa", cuisines: ["italian"], dishes: [], medicineGroups: [], conditions: [], needs: [] };
    expect(userProfileSchema.safeParse(base).success).toBe(true);
    expect(userProfileSchema.safeParse({ ...base, city: "chicago" }).success).toBe(true);
    expect(userProfileSchema.safeParse({ ...base, city: "gotham" }).success).toBe(false);
  });
});

describe("reading Qloo responses", () => {
  it("maps cuisine tags (both tag families) and ignores others", () => {
    expect(cuisineOfTags([{ id: "urn:tag:cuisine:qloo:greek", name: "Greek" }])).toBe("greek");
    expect(cuisineOfTags([{ id: "urn:tag:genre:place:restaurant:japanese", name: "Japanese" }])).toBe("japanese");
    expect(cuisineOfTags([{ id: "urn:tag:genre:place:restaurant:thai", name: "Thai" }])).toBeNull();
    expect(cuisineOfTags(undefined)).toBeNull();
  });

  it("turns entities into places with affinity, distance in km, rating and website", () => {
    const [p] = parsePlaces(response(entity()));
    expect(p).toMatchObject({ id: "qloo-AAAA-0001", name: "Test Trattoria", cuisine: "italian", source: "QLOO", score: 0.95, distanceKm: 1.2, rating: 4.5, address: "1 Example St", website: "https://example.test/" });
    expect(p.reason).toContain("Qloo taste match 95%");
  });

  it("skips closed places, nameless entities, unknown cuisines and non-http websites", () => {
    const places = parsePlaces(
      response(
        entity({ properties: { is_closed: true } }),
        entity({ name: "" }),
        entity({ entity_id: "AAAA-0002" }, ["urn:tag:genre:place:restaurant:thai"]),
        entity({ entity_id: "AAAA-0003", properties: { website: "javascript:alert(1)" } }),
      ),
    );
    expect(places.map((p) => p.id)).toEqual(["qloo-AAAA-0003"]);
    expect(places[0].website).toBeUndefined();
  });

  it("survives odd shapes without throwing", () => {
    expect(parsePlaces(null)).toEqual([]);
    expect(parsePlaces({ results: "nope" })).toEqual([]);
    expect(parsePlaces({ results: { entities: [null, 7, "x"] } })).toEqual([]);
  });
});

describe("the Qloo provider", () => {
  it("sends the key in X-Api-Key, never in the URL", async () => {
    const f = fakeFetch(response(entity()));
    const qloo = new QlooTasteProvider(config, f);
    const places = await qloo.recommendPlaces(taste, { take: 3 });
    expect(places).toHaveLength(1);
    const [url, init] = f.mock.calls[0];
    expect(String(url).startsWith("https://hackathon.example.test/v2/insights?")).toBe(true);
    expect(String(url)).not.toContain(config.apiKey);
    expect((init?.headers as Record<string, string>)["X-Api-Key"]).toBe(config.apiKey);
  });

  it("caches identical requests in memory", async () => {
    const f = fakeFetch(response(entity()));
    const qloo = new QlooTasteProvider(config, f);
    await qloo.recommendPlaces(taste, { take: 3 });
    await qloo.recommendPlaces(taste, { take: 3 });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("errors never contain the key", async () => {
    const qloo = new QlooTasteProvider(config, fakeFetch({ errors: [{ message: "bad" }] }, 401));
    await expect(qloo.recommendPlaces(taste)).rejects.toThrow("HTTP 401");
    await expect(qloo.recommendPlaces(taste)).rejects.not.toThrow(config.apiKey);
  });

  it("gives each favourite cuisine an affinity from its top places, and marks the rest as not favourites", async () => {
    const f = vi.fn(async (url: string | URL | Request) => {
      const italian = new URL(String(url)).searchParams.get("filter.tags") === cuisineTag("italian");
      return new Response(JSON.stringify(response(entity({ query: { affinity: italian ? 0.99 : 0.9, distance: 500 } }, [cuisineTag(italian ? "italian" : "greek")]))));
    }) as unknown as typeof fetch;
    const out = await new QlooTasteProvider(config, f).cuisineAffinities(taste);
    const by = Object.fromEntries(out.map((a) => [a.cuisine, a]));
    expect(by.italian).toMatchObject({ favourite: true, source: "QLOO", score: 0.99 });
    expect(by.greek).toMatchObject({ favourite: true, score: 0.9 });
    expect(by.indian).toMatchObject({ favourite: false, score: 0.1 });
    expect(out).toHaveLength(6);
  });
});

describe("short lists cover every favourite cuisine", () => {
  const place = (id: string, cuisine: string, score: number) => ({ id, name: id, cuisine, score, reason: "", source: "QLOO" as const });

  it("takes the best place of each cuisine in turn instead of three from the top scorer", () => {
    const places = [place("g1", "greek", 0.99), place("g2", "greek", 0.985), place("g3", "greek", 0.98), place("i1", "italian", 0.97), place("i2", "italian", 0.96)];
    expect(diversify(places, 3).map((p) => p.id)).toEqual(["g1", "i1", "g2"]);
    expect(diversify(places, 2).map((p) => p.id)).toEqual(["g1", "i1"]);
  });

  it("does not need several cuisines, and handles an empty list", () => {
    expect(diversify([place("a", "greek", 0.9)], 3).map((p) => p.id)).toEqual(["a"]);
    expect(diversify([], 3)).toEqual([]);
  });

  it("the provider uses it when no cuisine is asked for", async () => {
    const f = fakeFetch(
      response(
        entity({ entity_id: "G1", name: "Test Greek 1", query: { affinity: 0.99, distance: 500 } }, [cuisineTag("greek")]),
        entity({ entity_id: "G2", name: "Test Greek 2", query: { affinity: 0.98, distance: 500 } }, [cuisineTag("greek")]),
        entity({ entity_id: "I1", name: "Test Italian 1", query: { affinity: 0.97, distance: 500 } }, [cuisineTag("italian")]),
      ),
    );
    const out = await new QlooTasteProvider(config, f).recommendPlaces(taste, { take: 2 });
    expect(out.map((p) => p.cuisine)).toEqual(["greek", "italian"]);
  });
});

describe("falling back to the simulated provider", () => {
  it("uses made-up places, labelled SIMULATED, when Qloo errors", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const resilient = new ResilientTasteProvider(new QlooTasteProvider(config, fakeFetch({}, 429)), new MockTasteProvider());
    const places = await resilient.recommendPlaces(taste, { take: 3 });
    expect(places.length).toBeGreaterThan(0);
    for (const p of places) {
      expect(p.source).toBe("SIMULATED");
      expect(p.name).toContain("fictional");
    }
    const aff = await resilient.cuisineAffinities(taste);
    expect(aff.every((a) => a.source === "SIMULATED")).toBe(true);
  });

  it("falls back when the network fails, and logs no key", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const boom = vi.fn(async () => {
      throw new TypeError("network down");
    }) as unknown as typeof fetch;
    const resilient = new ResilientTasteProvider(new QlooTasteProvider(config, boom), new MockTasteProvider());
    expect((await resilient.recommendPlaces(taste))[0].source).toBe("SIMULATED");
    expect(JSON.stringify(warn.mock.calls)).not.toContain(config.apiKey);
  });

  it("does not replace an honest empty answer with made-up places", async () => {
    const resilient = new ResilientTasteProvider(new QlooTasteProvider(config, fakeFetch(response())), new MockTasteProvider());
    expect(await resilient.recommendPlaces(taste, { cuisine: "greek", take: 3 })).toEqual([]);
  });

  it("keeps real Qloo places labelled QLOO when Qloo works", async () => {
    const resilient = new ResilientTasteProvider(new QlooTasteProvider(config, fakeFetch(response(entity()))), new MockTasteProvider());
    expect((await resilient.recommendPlaces(taste))[0].source).toBe("QLOO");
  });
});

describe("source labels", () => {
  it("says simulated if any result is simulated, and Qloo only when all are", () => {
    expect(tasteSourceFor(["QLOO", "QLOO"])).toMatchObject({ simulated: false, fallback: false, name: "Qloo taste graph" });
    expect(tasteSourceFor(["QLOO", "SIMULATED"]).simulated).toBe(true);
    expect(tasteSourceFor([]).simulated).toBe(true); // no key in tests
  });

  it("reports a fallback only when Qloo is configured", () => {
    vi.stubEnv("QLOO_API_KEY", "set-for-this-test");
    expect(tasteSourceFor(["SIMULATED"])).toMatchObject({ simulated: true, fallback: true });
    vi.unstubAllEnvs();
    expect(tasteSourceFor(["SIMULATED"])).toMatchObject({ simulated: true, fallback: false });
  });
});
