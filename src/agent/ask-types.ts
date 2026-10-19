import type { WeeklyPlan } from "@/lib/meals";
import type { Verdict } from "@/safety/types";
import type { Place } from "@/taste/provider";

export interface AskStep {
  /** Short label for the visible chain, e.g. "Checked 22 rules". */
  short: string;
  detail: string;
}

/** Checked dishes, grouped by place when a place is known. Verdicts come only from the safety engine. */
export interface AskGroup {
  title: string;
  place?: Place;
  shown: Verdict[];
  excluded: Verdict[];
}

export interface AskResult {
  refused: null | "dosing" | "off_topic";
  /** Always ends with "Ask your pharmacist or doctor." */
  answer: string;
  wording: "gemini" | "template";
  wordingNote?: string;
  /** "Checked taste profile → Found 3 places → Checked 22 rules → Excluded 1 dish" */
  chain: string;
  steps: AskStep[];
  groups: AskGroup[];
  plan: WeeklyPlan | null;
  tasteSource: { name: string; simulated: boolean };
  activeRules: number;
}
