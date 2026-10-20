import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { runAgent, wordingOk } from "../src/agent/run";
import { runAsk } from "../src/agent/ask";
import { homeIdeas, tasteAffinity, weeklyPlan } from "../src/lib/meals";
import { toDemoPerson, type UserProfile } from "../src/lib/profile";
import { clearQlooCache } from "../src/taste/qloo-provider";

// Qloo's rules for participants: keep the key server-side; send no personal data (names, emails, device ids);
// results describe what groups tend to like, not what one person will do. These tests keep us honest.
// All data below is INVENTED.

const NAME = "Zorblax Quimby";
const profile: UserProfile = {
  name: NAME,
  city: "chicago",
  cuisines: ["italian", "greek", "japanese"],
  dishes: ["pasta", "udon"],
  medicineGroups: ["warfarin", "statins_grapefruit"],
  conditions: ["hypertension", "diabetes"],
  needs: ["easy_to_chew"],
};
const person = toDemoPerson(profile);

const ALLOWED_PARAMS = new Set([
  "filter.type",
  "filter.tags",
  "signal.interests.tags",
  "filter.location",
  "filter.location.radius",
  "take",
]);
const KEY = "test-key-not-real";

type Captured = { url: URL; init?: RequestInit };
let captured: Captured[] = [];

beforeEach(() => {
  clearQlooCache();
  captured = [];
  vi.stubEnv("QLOO_API_KEY", KEY);
  vi.stubEnv("QLOO_BASE_URL", "https://hackathon.example.test");
  vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input));
      captured.push({ url, init });
      const cuisine = (url.searchParams.get("filter.tags") ?? "").split(":").pop() || "italian";
      const entities = [0, 1, 2].map((i) => ({
        name: `Invented Place ${cuisine} ${i}`,
        entity_id: `INVENTED-${cuisine}-${i}`,
        query: { affinity: 0.9 - i / 100, distance: 800 + i },
        properties: { address: "1 Example Street", business_rating: 4.2, website: "https://example.test/" },
        tags: [{ id: `urn:tag:genre:place:restaurant:${cuisine}`, name: cuisine }],
      }));
      return new Response(JSON.stringify({ success: true, results: { entities } }), { status: 200 });
    }),
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function assertOnlyAggregateSignalsSent() {
  expect(captured.length).toBeGreaterThan(0);
  for (const { url, init } of captured) {
    // Where it goes
    expect(url.origin).toBe("https://hackathon.example.test");
    expect(url.pathname).toBe("/v2/insights");
    // What is sent: only these parameters, and only these kinds of values
    for (const [k, v] of url.searchParams) {
      expect(ALLOWED_PARAMS.has(k), `unexpected parameter: ${k}`).toBe(true);
      if (k === "filter.type") expect(v).toBe("urn:entity:place");
      if (k === "filter.tags") expect(v).toMatch(/^urn:tag:genre:place:restaurant(:[a-z]+)?$/);
      if (k === "signal.interests.tags") for (const t of v.split(",")) expect(t).toMatch(/^urn:tag:genre:place:restaurant:[a-z]+$/);
      if (k === "filter.location") expect(v).toMatch(/^POINT\(-?\d+(\.\d+)? -?\d+(\.\d+)?\)$/);
      if (k === "filter.location.radius" || k === "take") expect(v).toMatch(/^\d+$/);
    }
    // No body, and the key is the only header
    expect(init?.method ?? "GET").toBe("GET");
    expect(init?.body).toBeUndefined();
    expect(Object.keys((init?.headers ?? {}) as Record<string, string>)).toEqual(["X-Api-Key"]);
    // The key is never in the URL, and no personal or health detail appears anywhere in the request
    const everything = JSON.stringify([url.toString(), init?.headers ?? {}]).toLowerCase();
    expect(url.toString()).not.toContain(KEY);
    for (const secret of ["zorblax", "quimby", "warfarin", "statin", "hypertension", "diabetes", "chew", "pasta", "udon", "@"]) {
      expect(everything.includes(secret), `request contains "${secret}"`).toBe(false);
    }
  }
}

describe("only cuisine tags, a city-centre point and counts are sent to Qloo", () => {
  it("restaurants: no name, medicine, condition, dish or other personal detail", async () => {
    await runAgent(person);
    assertOnlyAggregateSignalsSent();
  });

  it("cook at home, weekly plan and taste map", async () => {
    await homeIdeas(person);
    await weeklyPlan(person);
    await tasteAffinity(person);
    assertOnlyAggregateSignalsSent();
  });

  it("the chat, even when the carer types the person's name and health details", async () => {
    await runAsk(person, "Zorblax Quimby wants fish tonight, which restaurant? Zorblax has diabetes and takes warfarin.");
    assertOnlyAggregateSignalsSent();
  });

  it("the location is a fixed city centre, never anything about the person", async () => {
    await runAgent(person);
    const points = new Set(captured.map((c) => c.url.searchParams.get("filter.location")));
    expect([...points]).toEqual(["POINT(-87.6298 41.8781)"]); // Chicago city centre preset
  });
});

const srcFiles: string[] = [];
const walk = (dir: string) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(e.name)) srcFiles.push(p);
  }
};
walk(path.join(__dirname, "..", "src"));

describe("the Qloo key stays on the server", () => {
  it("no client component touches the key, the Qloo provider or the taste module's values", () => {
    const client = srcFiles.filter((f) => fs.readFileSync(f, "utf8").trimStart().startsWith('"use client"'));
    expect(client.length).toBeGreaterThan(5);
    for (const f of client) {
      const src = fs.readFileSync(f, "utf8");
      expect(src, f).not.toMatch(/QLOO_API_KEY|X-Api-Key|qloo-provider/);
      expect(src, f).not.toMatch(/^import(?!\s+type)[^\n]*["']@\/taste/m);
    }
  });

  it("no NEXT_PUBLIC variable is used anywhere, so nothing is exposed to the browser", () => {
    for (const f of srcFiles) expect(fs.readFileSync(f, "utf8"), f).not.toContain("NEXT_PUBLIC_");
  });

  it("the key is read in one place only", () => {
    const readers = srcFiles.filter((f) => /env\.QLOO_API_KEY/.test(fs.readFileSync(f, "utf8")));
    expect(readers.map((f) => path.basename(f))).toEqual(["qloo-provider.ts"]);
  });
});

describe("wording never claims to predict one person's taste", () => {
  it("no text says 'real taste', 'exact taste', 'will love/enjoy' or shows a 'taste match' percentage", () => {
    const banned = /real taste|true taste|your exact taste|will love|will enjoy|taste match \{|taste match \d/i;
    for (const f of srcFiles) {
      fs.readFileSync(f, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (/never say/i.test(line)) return; // the instructions that forbid these phrases
          expect(line, `${path.basename(f)}:${i + 1}`).not.toMatch(banned);
        });
    }
  });

  it("every Qloo place card carries the group-level explanation", () => {
    const card = fs.readFileSync(path.join(__dirname, "..", "src", "components", "place-info.tsx"), "utf8");
    expect(card).toContain("groups of people with similar tastes tend to enjoy, not what one person will do");
    expect(card).toContain("Qloo affinity score");
  });

  it("model wording that predicts one person's taste is replaced by the plain template", () => {
    expect(wordingOk("They will love this place.")).toBe(false);
    expect(wordingOk("It matches her exact taste.")).toBe(false);
    expect(wordingOk("This is exactly what she enjoys.")).toBe(false);
    expect(wordingOk("People with similar tastes tend to enjoy this kind of place, and it is close by.")).toBe(true);
  });
});
