import type { Finding } from "@/safety/types";

/**
 * One-line "topic · who" labels for the front of a dish card. This is interface wording only.
 * The reviewed rule text (shown when the card is flipped) is what carries the safety meaning.
 */
export const RULE_PREVIEW: Record<string, string> = {
  R01: "Grapefruit · statins",
  R02: "Grapefruit · blood-pressure medicine",
  R03: "Grapefruit · your medicine",
  R04: "Vitamin K · warfarin",
  R05: "Cranberry · warfarin",
  R06: "Alcohol · sedating medicines",
  R07: "Alcohol · metformin",
  R08: "Cooked with alcohol · sedatives, metformin",
  R09: "Salt · blood pressure or heart",
  R10: "Potassium salt · ACE inhibitors, sartans",
  R11: "Potassium · ACE inhibitors, sartans",
  R12: "Tyramine · MAO inhibitors",
  R13: "Liquorice · blood-pressure tablets",
  R15: "Sugar · diabetes",
  R16: "Hard to chew · chewing problems",
  R17: "Tough meat · chewing problems",
  R18: "Choking risk · chewing or swallowing",
  R19: "Sticky or dry · swallowing",
  R20: "Mixed textures · swallowing",
  R21: "Dairy · antibiotics",
  R22: "Timing · levothyroxine",
  R23: "Alcohol · warfarin",
};

const SEVERITY: Record<Finding["action"], number> = { exclude: 0, swap: 1, warn: 2 };

/** The most serious finding first, then "+N more" if there are others. Empty string if no findings. */
export function previewFor(findings: Finding[]): string {
  if (findings.length === 0) return "";
  const sorted = [...findings].sort((a, b) => SEVERITY[a.action] - SEVERITY[b.action]);
  const first = RULE_PREVIEW[sorted[0].ruleId] ?? "See the rule";
  return sorted.length > 1 ? `${first} · +${sorted.length - 1} more` : first;
}
