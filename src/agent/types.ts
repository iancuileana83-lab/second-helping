import type { Verdict } from "@/safety/types";
import type { Place, TasteSourceInfo } from "@/taste/provider";

export interface PlaceResult {
  place: Place;
  /** Friendly "why this" sentence. Wording only; it never changes a safety verdict. */
  why: string;
  shown: Verdict[];
  excluded: Verdict[];
}

export interface PlanResult {
  personName: string;
  personSummary: string[];
  intro: string;
  /** "gemini" if the AI wrote the wording, "template" if plain fallback wording was used. */
  wording: "gemini" | "template";
  wordingNote?: string;
  tasteSource: TasteSourceInfo;
  activeRules: number;
  inactiveRules: number;
  places: PlaceResult[];
  /** What the agent did, in order, so the steps are visible. */
  trace: string[];
}
