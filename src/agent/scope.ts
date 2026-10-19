import { MENUS } from "@/data/menus";
import { CUISINE_OPTIONS, DISH_OPTIONS } from "@/lib/profile";
import { getActiveRules, keywordMatches } from "@/safety";

export type Scope = "ok" | "dosing" | "off_topic";

export const MAX_MESSAGE = 300;

/** Removes control characters and collapses spaces. Length is limited by the API. */
export function cleanMessage(raw: string): string {
  return raw.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}

const GENERIC_FOOD_WORDS = [
  "meal", "meals", "breakfast", "lunch", "dinner", "supper", "snack", "snacks", "tonight", "tomorrow",
  "eat", "eating", "eats", "drink", "drinks", "food", "foods", "restaurant", "restaurants", "cafe", "pub",
  "cook", "cooking", "recipe", "recipes", "menu", "dish", "dishes", "takeaway", "week", "weekly", "plan",
  "soup", "soft", "smooth", "fish", "seafood", "chicken", "beef", "lamb", "pork", "meat", "vegetable", "vegetables",
  "veg", "fruit", "juice", "coffee", "tea", "milk", "salad", "dessert", "pudding", "cake", "sweet", "salt", "salty",
  "sugar", "sugary", "bread", "rice", "noodles", "pasta", "pizza", "curry", "cheese", "egg", "eggs", "wine", "beer",
  "alcohol", "grapefruit", "spinach", "tomato", "potato", "nuts", "crunchy", "chew", "chewing", "swallow", "swallowing",
  "taste", "tastes", "favourite", "favorite", "like", "likes", "hungry", "nice", "treat",
];

// Built once: every word the app already knows as food, cuisine, dish or rule keyword.
let vocab: RegExp | null = null;
function vocabulary(): RegExp {
  if (vocab) return vocab;
  const words = new Set<string>(GENERIC_FOOD_WORDS);
  for (const c of CUISINE_OPTIONS) words.add(c.id);
  for (const d of DISH_OPTIONS) words.add(d.id);
  for (const dishes of Object.values(MENUS)) {
    for (const d of dishes) {
      for (const w of d.name.toLowerCase().split(/[^a-z]+/)) if (w.length > 3) words.add(w);
      for (const t of d.tags) for (const w of t.toLowerCase().split(/[^a-z]+/)) if (w.length > 3) words.add(w);
    }
  }
  for (const r of getActiveRules().rules) {
    for (const k of r.keywords) for (const w of k.toLowerCase().split(/[^a-z]+/)) if (w.length > 3) words.add(w);
  }
  const escaped = [...words].map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  vocab = new RegExp(`(?<![a-z])(?:${escaped.join("|")})(?:s|es)?(?![a-z])`, "i");
  return vocab;
}

const MEDICINE_WORDS = [
  "tablet", "tablets", "pill", "pills", "capsule", "capsules", "medicine", "medicines", "medication", "medications",
  "insulin", "statin", "statins", "warfarin", "metformin", "simvastatin", "atorvastatin", "ramipril", "levothyroxine",
  "doxycycline", "ciprofloxacin", "furosemide", "digoxin", "temazepam", "spironolactone", "amlodipine", "gliclazide",
];

const DOSING_UNITS = /\b(dose|doses|dosage|dosing|overdose|\d+(?:\.\d+)?\s?(?:mg|mcg|µg|ml|units?)\b)/i;
const DOSING_ACTION = new RegExp(
  `\\b(change|adjust|alter|reduce|increase|decrease|double|halve|skip|miss|stop|start|swap|switch|how much|how many|take more|take less)\\b[^.?!]{0,40}\\b(${MEDICINE_WORDS.join("|")})\\b`,
  "i",
);

export function scopeCheck(message: string): Scope {
  if (DOSING_UNITS.test(message) || DOSING_ACTION.test(message)) return "dosing";
  if (!vocabulary().test(message)) return "off_topic";
  return "ok";
}

/** Rule keywords (foods) named in the message, so they can be checked by the rules. */
export function foodsMentioned(message: string): string[] {
  const hay = message.toLowerCase();
  const found = new Set<string>();
  for (const r of getActiveRules().rules) {
    for (const k of r.keywords) {
      // Tags such as "alcohol-served" are not words a person types.
      if (/^[a-z]+(?: [a-z]+)*$/.test(k) && keywordMatches(k, hay)) found.add(k);
    }
  }
  return [...found];
}

export const REFUSAL_TEXT: Record<"dosing" | "off_topic", string> = {
  dosing:
    "I can't help with medicine doses or with changing how any medicine is taken. I can only suggest meals and check foods against the reviewed rules.",
  off_topic:
    "I can only help with meals, restaurants and food safety for the profile. Try asking for a dinner idea, a restaurant, a soft meal or a weekly plan.",
};
