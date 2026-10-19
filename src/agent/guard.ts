import type { Verdict } from "@/safety/types";

/**
 * The model may only choose and explain. These checks make sure its words never say
 * a flagged food is fine, never sound like medical clearance, and never talk about doses.
 */
const FORBIDDEN = /\b(safe|safely|cure|cures|treat|treats|diagnos\w*|guarantee\w*|doctor[- ]approved|dose|doses|dosage|mg)\b/i;
const PERMISSIVE =
  /\b(safe|safely|fine|ok|okay|allowed|permitted|no problem|not a problem|go ahead|can have|can eat|can drink|can be included|harmless|perfectly|won't|will not|doesn't|does not|no interaction|no risk|nothing to worry)\b/i;

/** Words that identify a dish or food that the rules flagged. */
function concerningTerms(verdicts: Verdict[]): string[] {
  const terms = new Set<string>();
  for (const v of verdicts) {
    if (v.status === "ok") continue;
    terms.add(v.dish.name.toLowerCase());
    for (const f of v.findings) for (const m of f.matched) if (!m.startsWith("meal:")) terms.add(m.toLowerCase());
  }
  return [...terms].filter((t) => t.length > 2);
}

export function modelTextOk(text: string, verdicts: Verdict[]): boolean {
  if (!text || text.length > 500) return false;
  if (FORBIDDEN.test(text) || /https?:\/\//i.test(text)) return false;
  const terms = concerningTerms(verdicts);
  for (const sentence of text.split(/[.!?\n]+/)) {
    const s = sentence.toLowerCase();
    if (PERMISSIVE.test(s) && terms.some((t) => s.includes(t))) return false;
  }
  return true;
}
