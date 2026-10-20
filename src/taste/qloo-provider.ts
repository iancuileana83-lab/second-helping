import {
  SEARCH_RADIUS_M,
  type CuisineAffinity,
  type Place,
  type RecommendOptions,
  type TasteProfile,
  type TasteProvider,
} from "./provider";

/**
 * The real Qloo provider. It uses the Insights API on the hackathon server:
 *   GET {base}/v2/insights  with the X-Api-Key header, parameters in the query string.
 * Cuisines are Qloo tags, places are filtered to restaurants near the chosen city.
 * Qloo data is only kept in this server's memory (a private cache); it is never written to the repo.
 */

export const DEFAULT_QLOO_BASE_URL = "https://hackathon.api.qloo.com";
export const RESTAURANT_TAG = "urn:tag:genre:place:restaurant";
export const cuisineTag = (cuisine: string) => `${RESTAURANT_TAG}:${cuisine}`;
/** The cuisines the app has typical dishes for. Places of other cuisines are skipped. */
export const SUPPORTED_CUISINES = ["italian", "indian", "chinese", "british", "greek", "japanese"] as const;

const TIMEOUT_MS = 15000;
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX = 200;

/** Private, in-memory cache shared by all requests on this server. */
const cache = new Map<string, { at: number; data: unknown }>();

export class QlooError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "QlooError";
  }
}

export interface QlooConfig {
  apiKey: string;
  baseUrl: string;
}

/** Reads the settings from the environment. The key may have stray spaces from pasting. */
export function qlooConfigFromEnv(env: Record<string, string | undefined> = process.env): QlooConfig | null {
  const apiKey = env.QLOO_API_KEY?.trim();
  if (!apiKey) return null;
  const baseUrl = (env.QLOO_BASE_URL?.trim() || DEFAULT_QLOO_BASE_URL).replace(/\/+$/, "");
  return { apiKey, baseUrl };
}

/** Insights parameters for restaurants near a point, ranked by affinity to the person's favourite cuisines. */
export function buildPlaceParams(taste: TasteProfile, options: { cuisine?: string; take: number }): URLSearchParams {
  const p = new URLSearchParams();
  p.set("filter.type", "urn:entity:place");
  p.set("filter.tags", options.cuisine ? cuisineTag(options.cuisine) : RESTAURANT_TAG);
  const liked = taste.likedCuisines.filter((c) => (SUPPORTED_CUISINES as readonly string[]).includes(c));
  if (liked.length > 0) p.set("signal.interests.tags", liked.map(cuisineTag).join(","));
  p.set("filter.location", `POINT(${taste.location.lon} ${taste.location.lat})`);
  p.set("filter.location.radius", String(SEARCH_RADIUS_M));
  p.set("take", String(options.take));
  return p;
}

const asRecord = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const label = (c: string) => c[0].toUpperCase() + c.slice(1);

/** Finds which supported cuisine a place serves, from its Qloo tags. */
export function cuisineOfTags(tags: unknown): string | null {
  if (!Array.isArray(tags)) return null;
  for (const t of tags) {
    const tag = asRecord(t);
    const id = typeof tag.id === "string" ? tag.id.toLowerCase() : "";
    const name = typeof tag.name === "string" ? tag.name.toLowerCase() : "";
    for (const c of SUPPORTED_CUISINES) {
      if (id.endsWith(`:restaurant:${c}`) || id.endsWith(`:cuisine:qloo:${c}`) || name === c) return c;
    }
  }
  return null;
}

/** Turns a Qloo insights response into places. Unknown shapes are skipped, never trusted blindly. */
export function parsePlaces(json: unknown, requestedCuisine?: string): Place[] {
  const results = asRecord(asRecord(json).results);
  const entities = Array.isArray(results.entities) ? results.entities : [];
  const out: Place[] = [];
  for (const raw of entities) {
    const e = asRecord(raw);
    const props = asRecord(e.properties);
    const query = asRecord(e.query);
    const name = typeof e.name === "string" ? e.name.trim() : "";
    const entityId = typeof e.entity_id === "string" ? e.entity_id : "";
    if (!name || !entityId || props.is_closed === true) continue;
    const cuisine = requestedCuisine ?? cuisineOfTags(e.tags);
    if (!cuisine) continue;
    const affinity = typeof query.affinity === "number" ? query.affinity : typeof e.popularity === "number" ? e.popularity : 0.5;
    const score = Math.max(0, Math.min(1, affinity));
    const distanceKm = typeof query.distance === "number" ? Math.round(query.distance / 100) / 10 : undefined;
    const website = typeof props.website === "string" && /^https?:\/\//i.test(props.website) ? props.website : undefined;
    out.push({
      id: `qloo-${entityId}`,
      name,
      cuisine,
      score,
      reason: `Qloo taste match ${Math.round(score * 100)}% for ${label(cuisine)} food${distanceKm !== undefined ? `, ${distanceKm} km away` : ""}.`,
      source: "QLOO",
      address: typeof props.address === "string" ? props.address : undefined,
      rating: typeof props.business_rating === "number" ? Math.round(props.business_rating * 10) / 10 : undefined,
      distanceKm,
      website,
    });
  }
  return out;
}

/** Best place of each cuisine in turn, so a short list covers every favourite cuisine, not just the top scorer. */
export function diversify(places: Place[], take: number): Place[] {
  const byCuisine = new Map<string, Place[]>();
  for (const p of [...places].sort((a, b) => b.score - a.score)) byCuisine.set(p.cuisine, [...(byCuisine.get(p.cuisine) ?? []), p]);
  const queues = [...byCuisine.values()].sort((a, b) => b[0].score - a[0].score);
  const out: Place[] = [];
  while (out.length < take && queues.some((q) => q.length > 0)) {
    for (const q of queues) {
      const next = q.shift();
      if (next && out.length < take) out.push(next);
    }
  }
  return out;
}

export class QlooTasteProvider implements TasteProvider {
  readonly name = "Qloo taste graph";
  readonly simulated = false;

  constructor(
    private readonly config: QlooConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  /** One cached GET. Errors never include the key. */
  private async get(path: string, params: URLSearchParams): Promise<unknown> {
    const url = `${this.config.baseUrl}${path}?${params.toString()}`;
    const hit = cache.get(url);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        headers: { "X-Api-Key": this.config.apiKey },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      throw new QlooError(err instanceof Error && err.name === "TimeoutError" ? "Qloo request timed out" : "Qloo request failed");
    }
    if (!res.ok) throw new QlooError(`Qloo request failed (HTTP ${res.status})`, res.status);
    const data: unknown = await res.json();
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
    cache.set(url, { at: Date.now(), data });
    return data;
  }

  async recommendPlaces(taste: TasteProfile, options: RecommendOptions = {}): Promise<Place[]> {
    const take = Math.min(options.take ?? 5, 10);
    // Ask for a few extra: places of cuisines the app has no dishes for are dropped.
    const params = buildPlaceParams(taste, { cuisine: options.cuisine, take: options.cuisine ? take : Math.min(take * 4, 20) });
    const places = parsePlaces(await this.get("/v2/insights", params), options.cuisine);
    return options.cuisine ? places.sort((a, b) => b.score - a.score).slice(0, take) : diversify(places, take);
  }

  async cuisineAffinities(taste: TasteProfile): Promise<CuisineAffinity[]> {
    const liked = new Set(taste.likedCuisines.filter((c) => (SUPPORTED_CUISINES as readonly string[]).includes(c)));
    return Promise.all(
      SUPPORTED_CUISINES.map(async (c): Promise<CuisineAffinity> => {
        if (!liked.has(c)) {
          return { cuisine: c, score: 0.1, favourite: false, reason: "Not one of their favourites.", source: "QLOO" };
        }
        const places = await this.recommendPlaces(taste, { cuisine: c, take: 5 });
        const top = places.slice(0, 3).map((p) => p.score);
        const score = top.length > 0 ? top.reduce((a, b) => a + b, 0) / top.length : 0;
        return {
          cuisine: c,
          score: Number(score.toFixed(3)),
          favourite: true,
          reason: `Qloo taste match ${Math.round(score * 100)}% for ${label(c)} food.`,
          source: "QLOO",
        };
      }),
    );
  }
}

/** Clears the private cache. Used by tests. */
export function clearQlooCache() {
  cache.clear();
}
