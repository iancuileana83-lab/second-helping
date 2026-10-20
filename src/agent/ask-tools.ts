import type { DemoPerson } from "@/data/demo-profiles";
import { MENUS } from "@/data/menus";
import { weeklyPlan, type WeeklyPlan } from "@/lib/meals";
import { CUISINE_OPTIONS } from "@/lib/profile";
import { evaluateDish } from "@/safety";
import type { ActiveRules, Dish, Meal, Verdict } from "@/safety";
import { tasteSourceFor } from "@/taste";
import type { Place, TasteProvider, TasteSourceInfo } from "@/taste";
import type { AskGroup, AskStep } from "./ask-types";

const SYNONYMS: Record<string, string[]> = {
  fish: ["fish", "salmon", "cod", "tuna", "haddock"],
  seafood: ["fish", "salmon", "squid", "prawn", "shellfish"],
  soft: ["soft", "moist", "smooth", "slow-cooked", "congee"],
  soup: ["soup", "broth", "miso", "congee"],
  curry: ["curry", "korma", "saag", "tikka", "dal"],
  noodle: ["noodle", "udon"],
  dessert: ["dessert", "tiramisu", "pudding", "baklava", "sorbet"],
  rice: ["rice", "risotto", "congee"],
  chicken: ["chicken"],
  beef: ["beef"],
  lamb: ["lamb", "kleftiko"],
  pasta: ["pasta", "cannelloni", "ragu"],
  salad: ["salad"],
  pie: ["pie"],
};
const STOP = new Set([
  "a", "an", "the", "for", "to", "of", "and", "or", "some", "any", "me", "her", "his", "their", "she", "he", "they",
  "wants", "want", "would", "like", "which", "what", "where", "restaurant", "restaurants", "meal", "meals", "dish",
  "dishes", "tonight", "today", "tomorrow", "please", "idea", "ideas", "plan", "something", "nice", "good", "eat",
  "with", "that", "is", "are", "can", "have", "has", "in", "on", "it",
]);
const MEAL_WORDS: Record<string, Meal> = { breakfast: "breakfast", lunch: "lunch", dinner: "dinner", supper: "dinner", tonight: "dinner" };

export function mealFromText(text: string): Meal | undefined {
  for (const w of text.toLowerCase().split(/[^a-z]+/)) if (MEAL_WORDS[w]) return MEAL_WORDS[w];
  return undefined;
}

export function queryTokens(text: string): string[] {
  const out = new Set<string>();
  for (const raw of text.toLowerCase().split(/[^a-z-]+/)) {
    if (!raw || STOP.has(raw) || MEAL_WORDS[raw]) continue;
    const hit = [raw, raw.replace(/s$/, ""), raw.replace(/es$/, "")].find((f) => SYNONYMS[f]);
    if (hit) out.add(hit);
  }
  return [...out];
}

const cuisineLabel = (id: string) => CUISINE_OPTIONS.find((c) => c.id === id)?.label ?? id;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

type Kind = "taste" | "search" | "places" | "check" | "plan";

/**
 * Everything the agent can do, as plain functions. The model picks which to call, and the app
 * can also run them itself. Safety verdicts come only from the rules engine, never from the model.
 */
export class AskContext {
  private order: Kind[] = [];
  private verdicts = new Map<string, Verdict>();
  private cuisineOf = new Map<string, string>();
  private places = new Map<string, Place>();
  private searched: { query: string; count: number } | null = null;
  /** Dishes returned by searchDishes, so the app can make sure each one is checked. */
  searchHits = new Set<string>();
  plan: WeeklyPlan | null = null;
  /** Foods the carer named that were checked, so the answer can address them directly. */
  requested = new Set<string>();

  constructor(
    readonly person: DemoPerson,
    readonly active: ActiveRules,
    readonly provider: TasteProvider,
  ) {}

  private mark(k: Kind) {
    if (!this.order.includes(k)) this.order.push(k);
  }

  get hasResults(): boolean {
    return this.verdicts.size > 0 || this.plan !== null;
  }
  get checked(): Verdict[] {
    return [...this.verdicts.values()];
  }

  /** Tool 1: the taste profile. Contains no medicines. */
  tasteProfile() {
    this.mark("taste");
    return { likedCuisines: this.person.taste.likedCuisines, likedDishes: this.person.taste.likedDishes, source: this.source() };
  }

  source() {
    return tasteSourceFor([...this.places.values()].map((p) => p.source)).simulated ? "SIMULATED taste data, not Qloo" : "Qloo";
  }

  /** Where the places in this answer came from, for the labels. */
  tasteSource(): TasteSourceInfo {
    const shown = this.groups().flatMap((g) => (g.place ? [g.place.source] : []));
    return tasteSourceFor(shown.length > 0 ? shown : [...this.places.values()].map((p) => p.source));
  }

  /** Tool 2: places ranked by Qloo's group-level affinity (or the labelled stand-in). */
  async findPlaces(cuisine?: string): Promise<Place[]> {
    this.mark("places");
    const found = await this.provider.recommendPlaces(this.person.taste, { cuisine, take: 3 });
    for (const p of found) this.places.set(p.id, p);
    return found;
  }

  /** Tool 3: typical dishes matching a request. Returns names only; safety is a separate tool. */
  searchDishes(query: string, meal?: Meal, cuisine?: string | string[]): { name: string; cuisine: string; meal?: Meal }[] {
    this.mark("search");
    const tokens = queryTokens(query);
    const allowed = cuisine ? (Array.isArray(cuisine) ? cuisine : [cuisine]) : null;
    const out: { name: string; cuisine: string; meal?: Meal }[] = [];
    for (const [c, dishes] of Object.entries(MENUS)) {
      if (allowed && !allowed.includes(c)) continue;
      for (const d of dishes) {
        if (meal && d.meal && d.meal !== meal) continue;
        const hay = `${d.name} ${d.tags.join(" ")}`.toLowerCase();
        const ok = tokens.every((t) => SYNONYMS[t].some((s) => new RegExp(`(?<![a-z])${s}`).test(hay)));
        if (ok) {
          out.push({ name: d.name, cuisine: c, meal: d.meal });
          this.cuisineOf.set(d.name.toLowerCase(), c);
          this.searchHits.add(d.name);
        }
      }
    }
    this.searched = { query: [query.trim(), meal].filter(Boolean).join(" "), count: out.length };
    return out.slice(0, 12);
  }

  /** Tool 4: the deterministic safety check, using the reviewed rules. Accepts menu dishes or any food name. */
  checkSafety(names: string[]): Verdict[] {
    this.mark("check");
    const out: Verdict[] = [];
    for (const raw of names.slice(0, 16)) {
      const name = raw.trim().slice(0, 60);
      if (!name) continue;
      const known = Object.entries(MENUS).flatMap(([c, ds]) => ds.map((d) => ({ c, d }))).find((x) => x.d.name.toLowerCase() === name.toLowerCase());
      const dish: Dish = known ? known.d : { name, tags: [] };
      if (known) this.cuisineOf.set(known.d.name.toLowerCase(), known.c);
      const v = evaluateDish(dish, this.person.profile, this.active);
      this.verdicts.set(dish.name.toLowerCase(), v);
      out.push(v);
    }
    return out;
  }

  /** Tool 5: a weekly plan built from dishes that passed the checks. */
  async weeklyPlan(): Promise<WeeklyPlan> {
    this.mark("plan");
    this.plan = await weeklyPlan(this.person);
    return this.plan;
  }

  /** Names of every place the taste tool returned, shown or not. */
  recordedPlaceNames(): string[] {
    return [...this.places.values()].map((p) => p.name);
  }

  /** Cuisines of the dishes checked so far (menu dishes only). */
  checkedCuisines(): string[] {
    const set = new Set<string>();
    for (const v of this.verdicts.values()) {
      const c = this.cuisineOf.get(v.dish.name.toLowerCase());
      if (c) set.add(c);
    }
    return [...set];
  }

  /** The visible chain, built from what really happened. */
  steps(): AskStep[] {
    const steps: AskStep[] = [];
    const rules = this.active.rules.length;
    const checked = this.checked;
    const blocked = checked.filter((v) => v.status === "blocked");
    const warned = checked.filter((v) => v.status === "warn" || v.status === "swap");
    // Report the places that are actually shown with the dishes; fall back to what was found.
    const shownPlaces = this.groups().flatMap((g) => (g.place ? [g.place] : []));
    const top = shownPlaces.length > 0 ? shownPlaces : [...this.places.values()].sort((a, b) => b.score - a.score).slice(0, 3);

    const canonical: Kind[] = ["taste", "search", "places", "check", "plan"];
    for (const k of canonical.filter((x) => this.order.includes(x))) {
      if (k === "taste") {
        const likes = this.person.taste.likedCuisines.map(cuisineLabel).join(", ") || "no cuisines yet";
        steps.push({ short: "Checked taste profile", detail: `Likes: ${likes}. Source: ${this.source()}.` });
      } else if (k === "search" && this.searched) {
        steps.push({
          short: `Searched menus (${plural(this.searched.count, "dish", "dishes")})`,
          detail: `Looked for “${this.searched.query || "any dish"}” among typical dishes. These are not real menus.`,
        });
      } else if (k === "places") {
        steps.push({
          short: `Found ${plural(top.length, "place")}`,
          detail: `${top.map((p) => p.name).join("; ") || "none"}. Ranked by affinity (what people with similar tastes tend to enjoy), ${this.source()}.`,
        });
      } else if (k === "check") {
        steps.push({
          short: `Checked ${rules} rules`,
          detail: `${plural(checked.length, "dish", "dishes")} checked against ${rules} reviewed rules: ${checked.length - blocked.length - warned.length} with no concerns, ${warned.length} with a caution or swap, ${blocked.length} excluded.`,
        });
        steps.push({
          short: blocked.length > 0 ? `Excluded ${plural(blocked.length, "dish", "dishes")}` : "Nothing excluded",
          detail: blocked.length > 0 ? `Left out: ${blocked.map((v) => v.dish.name).join("; ")}.` : "No dish was excluded by the rules.",
        });
      } else if (k === "plan" && this.plan) {
        steps.push({
          short: `Built weekly plan (${this.plan.slots.length} meals)`,
          detail: `Lunch and dinner from dishes that passed the checks. ${this.plan.excludedCount} dishes were left out.`,
        });
      }
    }
    return steps;
  }

  /** Checked dishes grouped by place (or cuisine, or "foods you asked about"). Verdicts are the engine's. */
  groups(): AskGroup[] {
    const byCuisine = new Map<string, Verdict[]>();
    const loose: Verdict[] = [];
    for (const v of this.verdicts.values()) {
      const c = this.cuisineOf.get(v.dish.name.toLowerCase());
      if (c) byCuisine.set(c, [...(byCuisine.get(c) ?? []), v]);
      else loose.push(v);
    }
    const bestPlace = (c: string) =>
      [...this.places.values()].filter((p) => p.cuisine === c).sort((a, b) => b.score - a.score)[0];
    const split = (vs: Verdict[]) => ({
      shown: vs.filter((v) => v.status !== "blocked").sort((a, b) => rank(a) - rank(b)),
      excluded: vs.filter((v) => v.status === "blocked"),
    });
    const groups: AskGroup[] = [];
    for (const [c, vs] of byCuisine) {
      const place = bestPlace(c);
      groups.push({ title: place ? place.name : `${cuisineLabel(c)} dishes`, place, ...split(vs) });
    }
    const liked = new Set(this.person.taste.likedCuisines);
    const taste = (g: AskGroup, c: string) => g.place?.score ?? (liked.has(c) ? 0.9 : 0.1);
    const keyed = groups.map((g, i) => ({ g, s: taste(g, [...byCuisine.keys()][i]) }));
    keyed.sort((a, b) => b.s - a.s);
    groups.length = 0;
    groups.push(...keyed.slice(0, 4).map((k) => k.g));
    if (loose.length > 0) groups.push({ title: "Foods you asked about", ...split(loose) });
    return groups;
  }
}

const rank = (v: Verdict) => ({ ok: 0, warn: 1, swap: 2, blocked: 3 })[v.status];
