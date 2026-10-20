// Makes a few small live calls to the Qloo hackathon API and prints COUNTS ONLY.
// Run with: npm run qloo:check   (reads QLOO_API_KEY and QLOO_BASE_URL from .env; never prints them)
// Nothing from the responses is saved, because Qloo data must not be stored in a public repository.

const key = (process.env.QLOO_API_KEY ?? "").trim();
const base = (process.env.QLOO_BASE_URL ?? "https://hackathon.api.qloo.com").trim().replace(/\/+$/, "");
if (!key) {
  console.error("QLOO_API_KEY is not set in .env");
  process.exit(1);
}

async function call(path, params) {
  const url = `${base}${path}?${new URLSearchParams(params)}`;
  const started = Date.now();
  const res = await fetch(url, { headers: { "X-Api-Key": key }, signal: AbortSignal.timeout(20000) });
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* not JSON */
  }
  return { status: res.status, ms: Date.now() - started, body };
}

const cities = { "New York": [40.7128, -74.006], London: [51.5072, -0.1276], Bucharest: [44.4268, 26.1025] };
let failed = false;

const tags = await call("/v2/tags", { "filter.query": "italian", "filter.parents.types": "urn:entity:place", take: "5" });
const tagCount = tags.body?.results?.tags?.length ?? 0;
console.log(`tags lookup: HTTP ${tags.status}, ${tagCount} tags, ${tags.ms} ms`);
failed ||= tags.status !== 200 || tagCount === 0;

for (const [city, [lat, lon]] of Object.entries(cities)) {
  const r = await call("/v2/insights", {
    "filter.type": "urn:entity:place",
    "filter.tags": "urn:tag:genre:place:restaurant",
    "signal.interests.tags": "urn:tag:genre:place:restaurant:italian,urn:tag:genre:place:restaurant:greek",
    "filter.location": `POINT(${lon} ${lat})`,
    "filter.location.radius": "5000",
    take: "5",
  });
  const entities = r.body?.results?.entities ?? [];
  const withAffinity = entities.filter((e) => typeof e?.query?.affinity === "number").length;
  console.log(`restaurants near ${city}: HTTP ${r.status}, ${entities.length} places, ${withAffinity} with affinity, ${r.ms} ms`);
  failed ||= r.status !== 200 || entities.length === 0;
}

console.log(failed ? "RESULT: something failed" : "RESULT: Qloo works");
process.exit(failed ? 1 : 0);
