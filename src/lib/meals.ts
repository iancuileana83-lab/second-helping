import { DAYS } from "@/lib/days";
import type { DemoPerson } from "@/data/demo-profiles";
import { menuFor } from "@/data/menus";
import { getActiveRules, screenDishes } from "@/safety";
import type { Meal, Verdict } from "@/safety";
import { getTasteProvider } from "@/taste";
import type { Place } from "@/taste";

const MIN_GOOD_SCORE = 0.3;

export interface HomeCuisine {
  cuisine: string;
  match: number;
  reason: string;
  shown: Verdict[];
  excluded: Verdict[];
}

export interface HomeIdeas {
  tasteSource: { name: string; simulated: boolean };
  cuisines: HomeCuisine[];
}

export interface PlanSlot {
  day: string;
  meal: "Lunch" | "Dinner";
  verdict: Verdict;
  cuisine: string;
}

export interface WeeklyPlan {
  tasteSource: { name: string; simulated: boolean };
  slots: PlanSlot[];
  notes: string[];
  excludedCount: number;
}

export { DAYS };

const STATUS_ORDER: Record<Verdict["status"], number> = { ok: 0, warn: 1, swap: 2, blocked: 3 };

/** Best place per cuisine from the taste provider, strongest first. */
async function rankedCuisines(person: DemoPerson) {
  const provider = getTasteProvider();
  const places = await provider.recommendPlaces(person.taste, { take: 50 });
  const best = new Map<string, Place>();
  for (const p of places) if (!best.has(p.cuisine)) best.set(p.cuisine, p);
  const ranked = [...best.values()].sort((a, b) => b.score - a.score);
  const strong = ranked.filter((p) => p.score >= MIN_GOOD_SCORE);
  const main = strong.length > 0 ? strong : ranked;
  return { provider, ranked: main, rest: ranked.filter((p) => !main.includes(p)) };
}

function byStatus(a: Verdict, b: Verdict) {
  return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
}

export interface TasteAffinity {
  tasteSource: { name: string; simulated: boolean };
  /** Favourite cuisines only, with a 0 to 1 affinity from the taste provider. */
  cuisines: { cuisine: string; score: number }[];
}

/** Affinity of each favourite cuisine, from the taste provider (simulated now, Qloo later). */
export async function tasteAffinity(person: DemoPerson): Promise<TasteAffinity> {
  const provider = getTasteProvider();
  const places = await provider.recommendPlaces(person.taste, { take: 50 });
  const best = new Map<string, number>();
  for (const p of places) best.set(p.cuisine, Math.max(best.get(p.cuisine) ?? 0, p.score));
  const cuisines = person.taste.likedCuisines
    .filter((c) => best.has(c))
    .map((c) => ({ cuisine: c, score: best.get(c) as number }))
    .sort((a, b) => b.score - a.score);
  return { tasteSource: { name: provider.name, simulated: provider.simulated }, cuisines };
}

export async function homeIdeas(person: DemoPerson): Promise<HomeIdeas> {
  const active = getActiveRules();
  const { provider, ranked } = await rankedCuisines(person);
  const cuisines = ranked.map((p): HomeCuisine => {
    const s = screenDishes(menuFor(p.cuisine), person.profile, active);
    return {
      cuisine: p.cuisine,
      match: p.score,
      reason: p.reason,
      shown: [...s.shown].sort(byStatus),
      excluded: s.excluded,
    };
  });
  return { tasteSource: { name: provider.name, simulated: provider.simulated }, cuisines };
}

/**
 * Builds a lunch and dinner for each day from dishes that passed the safety checks.
 * Dishes with no concerns come first. A dish excluded by a rule can never appear.
 */
export async function weeklyPlan(person: DemoPerson): Promise<WeeklyPlan> {
  const active = getActiveRules();
  const { provider, ranked, rest } = await rankedCuisines(person);
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
    notes.push("Some meals come from cuisines that are a weaker taste match, to fill the week.");
  }
  if (slots.some((s) => s.verdict.status !== "ok")) {
    notes.push("Some meals carry a caution or a suggested swap. They are shown with the reason.");
  }
  return { tasteSource: { name: provider.name, simulated: provider.simulated }, slots, notes, excludedCount };
}
