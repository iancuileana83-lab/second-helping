import type { CuisineAffinity, Place, RecommendOptions, TasteProfile, TasteProvider } from "./provider";

/**
 * STAND-IN, NOT QLOO. Fictional places with a simple overlap score, used when no Qloo key is set
 * or when Qloo cannot be reached. Everything it returns is labelled simulated.
 */
interface FictionalPlace {
  id: string;
  name: string;
  cuisine: string;
  aliases: string[];
}

const FICTIONAL_PLACES: FictionalPlace[] = [
  { id: "sim-1", name: "Trattoria Esempio (fictional)", cuisine: "italian", aliases: ["pasta", "risotto"] },
  { id: "sim-2", name: "Casa Ficticia (fictional)", cuisine: "italian", aliases: ["pizza"] },
  { id: "sim-3", name: "Spice Garden Example (fictional)", cuisine: "indian", aliases: ["curry", "dal"] },
  { id: "sim-4", name: "Jade Lantern Example (fictional)", cuisine: "chinese", aliases: ["congee", "dumplings"] },
  { id: "sim-5", name: "The Imaginary Arms (fictional)", cuisine: "british", aliases: ["roast", "pie"] },
  { id: "sim-6", name: "Olive Tree Example (fictional)", cuisine: "greek", aliases: ["moussaka", "salad"] },
  { id: "sim-7", name: "Sakura Example (fictional)", cuisine: "japanese", aliases: ["miso", "udon"] },
];

const label = (c: string) => c[0].toUpperCase() + c.slice(1);

function scoreFor(taste: TasteProfile, cuisine: string, aliases: string[], name?: string) {
  const liked = new Set(taste.likedCuisines.map((c) => c.toLowerCase()));
  const likedWords = taste.likedDishes.map((d) => d.toLowerCase());
  const likedPlaces = new Set(taste.likedPlaces.map((p) => p.toLowerCase()));
  let score = 0.1;
  const reasons: string[] = [];
  if (liked.has(cuisine)) {
    score += 0.6;
    reasons.push(`they enjoy ${label(cuisine)} food`);
  }
  if (aliases.some((a) => likedWords.some((d) => d.includes(a)))) {
    score += 0.2;
    reasons.push("it serves dishes like ones they like");
  }
  if (name && likedPlaces.has(name.toLowerCase())) {
    score += 0.1;
    reasons.push("they have been there before");
  }
  return {
    score: Math.min(1, Number(score.toFixed(2))),
    reason: reasons.length > 0 ? `Simulated match: ${reasons.join(" and ")}.` : "Simulated match: no strong signal.",
  };
}

export class MockTasteProvider implements TasteProvider {
  readonly name = "Simulated taste provider (stand-in for Qloo)";
  readonly simulated = true;

  async recommendPlaces(taste: TasteProfile, options: RecommendOptions = {}): Promise<Place[]> {
    const places = FICTIONAL_PLACES.filter((p) => !options.cuisine || p.cuisine === options.cuisine.toLowerCase()).map(
      (p): Place => ({
        id: p.id,
        name: p.name,
        cuisine: p.cuisine,
        ...scoreFor(taste, p.cuisine, p.aliases, p.name),
        source: "SIMULATED",
      }),
    );
    return places.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, options.take ?? 5);
  }

  async cuisineAffinities(taste: TasteProfile): Promise<CuisineAffinity[]> {
    const liked = new Set(taste.likedCuisines.map((c) => c.toLowerCase()));
    const cuisines = [...new Set(FICTIONAL_PLACES.map((p) => p.cuisine))];
    return cuisines.map((c) => {
      const aliases = FICTIONAL_PLACES.filter((p) => p.cuisine === c).flatMap((p) => p.aliases);
      const { score, reason } = scoreFor(taste, c, aliases);
      return { cuisine: c, score, favourite: liked.has(c), reason, source: "SIMULATED" as const };
    });
  }
}
