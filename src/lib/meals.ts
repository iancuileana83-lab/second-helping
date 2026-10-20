import { DAYS } from "@/lib/days";
import type { DemoPerson } from "@/data/demo-profiles";
import { menuFor } from "@/data/menus";
import { getActiveRules, screenDishes } from "@/safety";
import type { Meal, Verdict } from "@/safety";
import { getTasteProvider, tasteSourceFor } from "@/taste";
import type { CuisineAffinity, TasteSource, TasteSourceInfo } from "@/taste";

export interface HomeCuisine {
  cuisine: string;
  match: number;
  reason: string;
  favourite: boolean;
  source: TasteSource;
  shown: Verdict[];
  excluded: Verdict[];
}

export interface HomeIdeas {
  tasteSource: TasteSourceInfo;
  cuisines: HomeCuisine[];
}

export interface PlanSlot {
  day: string;
  meal: "Lunch" | "Dinner";
  verdict: Verdict;
  cuisine: string;
}

export interface WeeklyPlan {
  tasteSource: TasteSourceInfo;
  slots: PlanSlot[];
  notes: string[];
  excludedCount: number;
}

export { DAYS };

const STATUS_ORDER: Record<Verdict["status"], number> = { ok: 0, warn: 1, swap: 2, blocked: 3 };

/** Cuisines from the taste provider: favourites first, strongest first; the rest only fill gaps. */
async function rankedCuisines(person: DemoPerson) {
  const affinities = await getTasteProvider().cuisineAffinities(person.taste);
  const sorted = [...affinities].sort((x, y) => y.score - x.score);
  const favourites = sorted.filter((a) => a.favourite);
  const main: CuisineAffinity[] = favourites.length > 0 ? favourites : sorted;
  const rest = sorted.filter((a) => !main.includes(a));
  return { ranked: main, rest, tasteSource: tasteSourceFor(main.map((a) => a.source)) };
}

function byStatus(a: Verdict, b: Verdict) {
  return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
}

export interface TasteAffinity {
  tasteSource: TasteSourceInfo;
  /** Favourite cuisines only, with a 0 to 1 affinity from the taste provider. */
  cuisines: { cuisine: string; score: number }[];
}

/** Affinity of each favourite cuisine, from the taste provider (Qloo, or the labelled stand-in). */
export async function tasteAffinity(person: DemoPerson): Promise<TasteAffinity> {
  const { ranked, tasteSource } = await rankedCuisines(person);
  const cuisines = ranked
    .filter((a) => a.favourite)
    .map((a) => ({ cuisine: a.cuisine, score: a.score }))
    .sort((x, y) => y.score - x.score);
  return { tasteSource, cuisines };
}

export async function homeIdeas(person: DemoPerson): Promise<HomeIdeas> {
  const active = getActiveRules();
  const { ranked, tasteSource } = await rankedCuisines(person);
  const cuisines = ranked.map((p): HomeCuisine => {
    const s = screenDishes(menuFor(p.cuisine), person.profile, active);
    return {
      cuisine: p.cuisine,
      match: p.score,
      reason: p.reason,
      favourite: p.favourite,
      source: p.source,
      shown: [...s.shown].sort(byStatus),
      excluded: s.excluded,
    };
  });
  return { tasteSource, cuisines };
}

/**
 * Builds a lunch and dinner for each day from dishes that passed the safety checks.
 * Dishes with no concerns come first. A dish excluded by a rule can never appear.
 */
export async function weeklyPlan(person: DemoPerson): Promise<WeeklyPlan> {
  const active = getActiveRules();
  const { ranked, rest, tasteSource } = await rankedCuisines(person);
  const notes: string[] = [];
  const restNames = new Set(rest.map((p) => p.cuisine));

  let excludedCount = 0;
  const lists = [...ranked, ...rest].map((p) => {
    const s = screenDishes(menuFor(p.cuisine), person.profile, active);
    excludedCount += s.excluded.length;
    const meals = s.shown.filter((v) => v.dish.meal !== "snack" && v.dish.meal !== "breakfast");
    return { cuisine: p.cuisine, ok: meals.filter((v) => v.status === "ok"), other: meals.filter((v) => v.status !== "ok").sort(byStatus) };
  });

  // Round-robin across cuisines so the week has variety; dishes with no concerns first.
  const interleave = (pick: (l: (typeof lists)[number]) => Verdict[]) => {
    const out: { verdict: Verdict; cuisine: string }[] = [];
    const queues = lists.map((l) => ({ cuisine: l.cuisine, items: [...pick(l)] }));
    while (queues.some((q) => q.items.length > 0)) {
      for (const q of queues) {
        const v = q.items.shift();
        if (v) out.push({ verdict: v, cuisine: q.cuisine });
      }
    }
    return out;
  };
  const isMain = (l: (typeof lists)[number]) => !restNames.has(l.cuisine);
  const only = (keep: (l: (typeof lists)[number]) => boolean, pick: (l: (typeof lists)[number]) => Verdict[]) =>
    interleave((l) => (keep(l) ? pick(l) : []));
  // Favourite cuisines first; weaker taste matches only fill gaps.
  const pool = [
    ...only(isMain, (l) => l.ok),
    ...only(isMain, (l) => l.other),
    ...only((l) => !isMain(l), (l) => l.ok),
    ...only((l) => !isMain(l), (l) => l.other),
  ];

  const slots: PlanSlot[] = [];
  const used = new Set<string>();
  const wants: Meal[][] = [["lunch", "dinner"], ["dinner", "lunch"]];
  const mealNames = ["Lunch", "Dinner"] as const;

  for (const day of DAYS) {
    for (let m = 0; m < 2; m++) {
      const fits = (c: (typeof pool)[number]) => !c.verdict.dish.meal || wants[m].includes(c.verdict.dish.meal);
      const prev = slots[slots.length - 1];
      const candidates = pool.filter((c) => !used.has(c.verdict.dish.name) && fits(c));
      const choice =
        candidates.find((c) => !prev || c.cuisine !== prev.cuisine) ?? candidates[0];
      if (!choice) continue;
      used.add(choice.verdict.dish.name);
      slots.push({ day, meal: mealNames[m], verdict: choice.verdict, cuisine: choice.cuisine });
    }
  }

  if (slots.length < DAYS.length * 2) {
    notes.push(
      `Only ${slots.length} of ${DAYS.length * 2} meals could be filled without repeating a dish. Add more favourite cuisines to see more variety.`,
    );
  }
  if (slots.some((s) => restNames.has(s.cuisine))) {
    notes.push("Some meals come from cuisines that are not among their favourites, to fill the week.");
  }
  if (slots.some((s) => s.verdict.status !== "ok")) {
    notes.push("Some meals carry a caution or a suggested swap. They are shown with the reason.");
  }
  return { tasteSource, slots, notes, excludedCount };
}
