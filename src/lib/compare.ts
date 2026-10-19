import { getActiveRules, evaluateDish } from "@/safety";
import type { Dish, Verdict } from "@/safety";
import { toDemoPerson, type UserProfile } from "@/lib/profile";

/**
 * ILLUSTRATIVE ONLY. These are invented examples of the kind of suggestion a generic chatbot
 * might make. They are not real chatbot output. SafePlate's right-hand side is the real rule engine.
 */
export interface IllustrativeSuggestion {
  dish: Dish;
  chatbotSays: string;
}

export const ILLUSTRATIVE_SUGGESTIONS: IllustrativeSuggestion[] = [
  {
    dish: { name: "Grapefruit juice with breakfast", meal: "breakfast", tags: ["grapefruit"] },
    chatbotSays: "Start the day with a refreshing glass of grapefruit juice.",
  },
  {
    dish: { name: "Tiramisu made with marsala", meal: "snack", tags: ["alcohol-soaked", "marsala", "dessert"] },
    chatbotSays: "Finish with a classic tiramisu made with marsala.",
  },
  {
    dish: { name: "Spinach saag", meal: "dinner", tags: ["spinach"] },
    chatbotSays: "A big plate of spinach saag is full of goodness.",
  },
  {
    dish: { name: "Cured ham and olive platter", meal: "lunch", tags: ["cured meat", "ham", "olive", "high-salt"] },
    chatbotSays: "Try a cured ham and olive platter.",
  },
  {
    dish: { name: "Salted peanuts", meal: "snack", tags: ["peanut", "crunchy"] },
    chatbotSays: "Crunchy salted peanuts make a great snack.",
  },
];

export interface ComparisonRow {
  chatbotSays: string;
  verdict: Verdict;
}

/** The same illustrative suggestions, checked by the real rules for this profile. Only ones that matter are returned. */
export function compareIllustrative(profile: UserProfile, max = 4): ComparisonRow[] {
  const active = getActiveRules();
  const person = toDemoPerson(profile).profile;
  return ILLUSTRATIVE_SUGGESTIONS.map((s) => ({
    chatbotSays: s.chatbotSays,
    verdict: evaluateDish(s.dish, person, active),
  }))
    .filter((r) => r.verdict.status !== "ok")
    .slice(0, max);
}
