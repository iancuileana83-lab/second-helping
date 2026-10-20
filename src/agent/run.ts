import { generateText, Output, stepCountIs, tool } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import type { DemoPerson } from "@/data/demo-profiles";
import { MENUS, menuFor } from "@/data/menus";
import { getActiveRules, screenDishes } from "@/safety";
import type { Screening } from "@/safety";
import { getTasteProvider, tasteSourceFor } from "@/taste";
import { diversify } from "@/taste/qloo-provider";
import type { Place } from "@/taste";
import { MODEL_ID } from "./model";
import type { PlaceResult, PlanResult } from "./types";

/**
 * How the agent works:
 * 1. The model decides which cuisines to explore, using two tools: findPlaces (taste ranking)
 *    and checkMenu (the deterministic safety engine).
 * 2. The shortlist is built by this code from what the tools returned. The model never
 *    writes or changes a safety verdict.
 * 3. The model then writes friendly "why this" wording only. If it is unavailable or its
 *    wording looks wrong, plain template wording is used and the app still works.
 */

const CUISINES = Object.keys(MENUS) as [string, ...string[]];
const MAX_PLACES = 3;
const MIN_GOOD_SCORE = 0.3;
/** Wording that would sound like medical clearance. Rejected in model text. */
const FORBIDDEN_WORDING =
  /\b(safe|safely|cure|cures|treat|treats|diagnos\w*|guarantee\w*|doctor[- ]approved|predict\w*|(?:they|she|he|you) (?:will|would) (?:love|enjoy|like|adore)|(?:exactly|perfectly) (?:what|matches|suits)|exact taste|perfect (?:for|match))\b/i;

function describePerson(p: DemoPerson, groupLabels: Record<string, { label: string }>): string[] {
  const out: string[] = [];
  const meds = [
    ...p.profile.medicines,
    ...(p.profile.medicineGroups ?? []).map((g) => groupLabels[g]?.label ?? g),
  ];
  if (meds.length) out.push(`Medicines: ${meds.join("; ")}`);
  if (p.profile.conditions.length) out.push(`Conditions: ${p.profile.conditions.map((c) => c.replace("_", " ")).join(", ")}`);
  if (p.profile.needs.length) out.push(`Eating needs: ${p.profile.needs.map((n) => n.replace(/_/g, " ")).join(", ")}`);
  return out;
}

function templateWhy(place: Place, shownCount: number): string {
  return `${place.reason} ${shownCount} typical dish${shownCount === 1 ? "" : "es"} passed our checks.`;
}

/** A slip Gemini sometimes makes: dropping the verb, as in "and it conveniently close by". Such wording is replaced by the plain template. */
const GRAMMAR_SLIPS = /\b(and|but|because|so) it (conveniently|nearby|close by|close to|near|located|situated)\b/i;

export function wordingOk(text: string): boolean {
  return text.length > 0 && text.length <= 400 && !FORBIDDEN_WORDING.test(text) && !GRAMMAR_SLIPS.test(text);
}

export async function runAgent(person: DemoPerson): Promise<PlanResult> {
  const provider = getTasteProvider();
  const active = getActiveRules();
  const trace: string[] = [];
  const seenPlaces = new Map<string, Place>();
  const screenings = new Map<string, Screening>();

  const screen = (cuisine: string): Screening => {
    let s = screenings.get(cuisine);
    if (!s) {
      s = screenDishes(menuFor(cuisine), person.profile, active);
      screenings.set(cuisine, s);
    }
    return s;
  };

  const tools = {
    findPlaces: tool({
      description:
        "Find places ranked by this person's taste. Optionally limit to one cuisine. Returns place ids, cuisine and a taste score.",
      inputSchema: z.object({ cuisine: z.enum(CUISINES).optional() }),
      execute: async ({ cuisine }) => {
        const places = await provider.recommendPlaces(person.taste, { cuisine, take: MAX_PLACES });
        for (const p of places) seenPlaces.set(p.id, p);
        trace.push(`Looked for places${cuisine ? ` serving ${cuisine} food` : ""}: found ${places.length}.`);
        return places.map((p) => ({ id: p.id, name: p.name, cuisine: p.cuisine, score: p.score }));
      },
    }),
    checkMenu: tool({
      description:
        "Run the safety checks on the typical dishes of one cuisine for this person. Returns, for each dish, its status and the rule ids that applied. The checks are fixed rules; you cannot change them.",
      inputSchema: z.object({ cuisine: z.enum(CUISINES) }),
      execute: async ({ cuisine }) => {
        const s = screen(cuisine);
        trace.push(
          `Checked ${cuisine} dishes against the safety rules: ${s.shown.length} shown, ${s.excluded.length} excluded.`,
        );
        return [...s.shown, ...s.excluded].map((v) => ({
          dish: v.dish.name,
          status: v.status,
          rules: v.findings.map((f) => f.ruleId),
        }));
      },
    }),
  };

  let agentNote: string | undefined;
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    try {
      await generateText({
        model: google(MODEL_ID),
        tools,
        stopWhen: stepCountIs(6),
        abortSignal: AbortSignal.timeout(25_000),
        system:
          "You help a family member choose a meal out for an older adult. Use findPlaces to see places ranked by Qloo's group-level affinity (what people with similar tastes tend to enjoy), then use checkMenu for the cuisines of the best places. Check two or three cuisines at most, then stop. Never give medical advice and never decide what is safe: the checks are done by the tools.",
        prompt: `The person is ${person.profile.name}. They enjoy these cuisines: ${person.taste.likedCuisines.join(", ")}. Dishes they like: ${person.taste.likedDishes.join(", ")}. Explore their liked cuisines first.`,
      });
    } catch (err) {
      agentNote = `AI step unavailable (${err instanceof Error ? err.name : "error"}).`;
    }
  } else {
    agentNote = "No AI key set, so the default exploration order was used.";
  }

  // Completeness is guaranteed by code, not by the model.
  if (seenPlaces.size === 0) {
    const places = await provider.recommendPlaces(person.taste, { take: MAX_PLACES });
    for (const p of places) seenPlaces.set(p.id, p);
    trace.push(`Looked for places by taste: found ${places.length}.`);
  }
  // The code, not the model, makes sure every favourite cuisine (up to three) was looked at.
  for (const c of person.taste.likedCuisines.slice(0, MAX_PLACES)) {
    if ([...seenPlaces.values()].some((p) => p.cuisine === c)) continue;
    const places = await provider.recommendPlaces(person.taste, { cuisine: c, take: MAX_PLACES });
    for (const p of places) seenPlaces.set(p.id, p);
    trace.push(`Looked for places serving ${c} food: found ${places.length}.`);
  }
  const ranked = [...seenPlaces.values()].sort((a, b) => b.score - a.score);
  // Skip weak matches when there are good ones, so the shortlist stays relevant.
  const strong = ranked.filter((p) => p.score >= MIN_GOOD_SCORE);
  // Best place of each cuisine in turn, so the shortlist covers every favourite cuisine.
  const top = diversify(strong.length > 0 ? strong : ranked, MAX_PLACES);
  for (const p of top) screen(p.cuisine);

  const places: PlaceResult[] = top.map((place) => {
    const s = screen(place.cuisine);
    return { place, why: templateWhy(place, s.shown.length), shown: s.shown, excluded: s.excluded };
  });

  let intro = `Here are places that people with similar tastes tend to enjoy, with each typical dish checked against our safety rules. Always check with the restaurant.`;
  let wording: PlanResult["wording"] = "template";
  let wordingNote = agentNote;

  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    try {
      const facts = places.map((r) => ({
        placeId: r.place.id,
        name: r.place.name,
        cuisine: r.place.cuisine,
        tasteReason: r.place.reason,
      }));
      const { output } = await generateText({
        model: google(MODEL_ID),
        abortSignal: AbortSignal.timeout(25_000),
        output: Output.object({
          schema: z.object({
            intro: z.string(),
            whys: z.array(z.object({ placeId: z.string(), why: z.string() })),
          }),
        }),
        system:
          "You write short, warm, plain-language wording for a family member or carer choosing a meal out for an older adult. Write about the person in the third person (they, their), not 'you'. Use only the facts given. One sentence per place, saying why the cuisine or place suits their taste. Do not name any dish, because the app lists and checks dishes itself. Places can be real restaurants: use a place only by its given name and never claim what it serves, its menu or its quality. Do not mention medicines or health conditions. Never say anything is safe and never give medical advice. Do not use hype words. Qloo scores describe what groups of people with similar tastes tend to enjoy: say that (for example 'people with similar tastes tend to enjoy this kind of place'), and never say the person will love or enjoy it, or that it matches their exact taste. Write complete, grammatical sentences: never leave out a verb such as \"is\" (write \"and it is close by\", not \"and it close by\").",
        prompt: `Person: ${person.profile.name}. Write one intro sentence and one 'why it may suit them' per place.\nFacts: ${JSON.stringify(facts)}`,
      });
      if (wordingOk(output.intro)) intro = output.intro;
      let used = 0;
      for (const w of output.whys) {
        const r = places.find((x) => x.place.id === w.placeId);
        if (!r) continue;
        const names = [...r.shown, ...r.excluded].map((v) => v.dish.name.toLowerCase());
        // Wording must never promote a dish, because dishes carry their own verdicts.
        if (wordingOk(w.why) &&!names.some((n) => w.why.toLowerCase().includes(n))) {
          r.why = w.why;
          used++;
        }
      }
      wording = used > 0 ? "gemini" : "template";
      if (used < places.length) wordingNote = "Some wording used plain templates.";
    } catch (err) {
      wordingNote = [agentNote, `AI wording unavailable (${err instanceof Error ? err.name : "error"}), plain wording used.`]
        .filter(Boolean)
        .join(" ");
    }
  }

  return {
    personName: person.profile.name,
    personSummary: describePerson(person, active.groups),
    intro,
    wording,
    wordingNote,
    tasteSource: tasteSourceFor(top.map((p) => p.source)),
    activeRules: active.rules.length,
    inactiveRules: active.inactive.length,
    places,
    trace,
  };
}
