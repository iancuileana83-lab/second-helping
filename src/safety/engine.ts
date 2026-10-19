import type {
  ActiveRules,
  Clause,
  Dish,
  Finding,
  GroupFile,
  Profile,
  Rule,
  RuleFile,
  Status,
  Verdict,
} from "./types";

/**
 * Deterministic safety layer. No AI is involved in any decision here.
 * A rule is used only if the reviewer marked it reviewed AND every medicine
 * group it refers to is also reviewed. Everything else is reported as inactive.
 */

function clauseGroups(rule: Rule): string[] {
  return rule.applies_when.any_of.flatMap((c) => ("group" in c ? [c.group] : []));
}

export function loadActiveRules(ruleFile: RuleFile, groupFile: GroupFile): ActiveRules {
  const rules: Rule[] = [];
  const inactive: ActiveRules["inactive"] = [];
  const usableGroups: ActiveRules["groups"] = {};
  for (const [id, g] of Object.entries(groupFile.groups)) {
    if (g.reviewed === true) usableGroups[id] = g;
  }

  for (const rule of ruleFile.rules) {
    if (rule.reviewed !== true) {
      inactive.push({ ruleId: rule.id, reason: "rule not reviewed" });
      continue;
    }
    const missing = clauseGroups(rule).filter((g) => !usableGroups[g]);
    if (missing.length > 0) {
      inactive.push({
        ruleId: rule.id,
        reason: `medicine group not reviewed or unknown: ${missing.join(", ")}`,
      });
      continue;
    }
    rules.push(rule);
  }
  return { rules, groups: usableGroups, askLine: ruleFile.ask_line, inactive };
}

function norm(s: string): string {
  return s.toLowerCase().trim();
}

function clauseApplies(clause: Clause, profile: Profile, active: ActiveRules): boolean {
  if ("group" in clause) {
    const group = active.groups[clause.group];
    if (!group) return false;
    if (profile.medicineGroups?.includes(clause.group)) return true;
    const members = new Set(group.members.map(norm));
    return profile.medicines.some((m) => members.has(norm(m)));
  }
  if ("condition" in clause) return profile.conditions.includes(clause.condition);
  return profile.needs.includes(clause.need);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whole-term match (optional plural), so "ham" does not match "hamburger". */
function keywordMatches(keyword: string, haystack: string): boolean {
  const re = new RegExp(`(?<![a-z0-9-])${escapeRe(norm(keyword))}(?:s|es)?(?![a-z0-9-])`);
  return re.test(haystack);
}

function dishHaystack(dish: Dish): string {
  return [dish.name, ...dish.tags].map(norm).join(" | ");
}

function withAskLine(message: string, askLine: string): string {
  return message.toLowerCase().includes(askLine.toLowerCase().replace(/\.$/, ""))
    ? message
    : `${message} ${askLine}`;
}

export function evaluateDish(dish: Dish, profile: Profile, active: ActiveRules): Verdict {
  const hay = dishHaystack(dish);
  const findings: Finding[] = [];

  for (const rule of active.rules) {
    if (!rule.applies_when.any_of.some((c) => clauseApplies(c, profile, active))) continue;

    const matched = rule.keywords.filter((k) => keywordMatches(k, hay));
    if (rule.meals && dish.meal && rule.meals.includes(dish.meal)) matched.push(`meal:${dish.meal}`);
    if (matched.length === 0) continue;

    findings.push({
      ruleId: rule.id,
      action: rule.action,
      message: withAskLine(rule.message, active.askLine),
      swap: rule.swap,
      matched,
    });
  }

  let status: Status = "ok";
  if (findings.some((f) => f.action === "exclude")) status = "blocked";
  else if (findings.some((f) => f.action === "swap")) status = "swap";
  else if (findings.length > 0) status = "warn";
  return { dish, status, findings };
}

export interface Screening {
  shown: Verdict[];
  excluded: Verdict[];
  inactive: ActiveRules["inactive"];
}

/** Every dish is accounted for: shown (ok/warn/swap) or excluded with reasons. */
export function screenDishes(dishes: Dish[], profile: Profile, active: ActiveRules): Screening {
  const verdicts = dishes.map((d) => evaluateDish(d, profile, active));
  return {
    shown: verdicts.filter((v) => v.status !== "blocked"),
    excluded: verdicts.filter((v) => v.status === "blocked"),
    inactive: active.inactive,
  };
}
