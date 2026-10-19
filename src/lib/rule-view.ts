import type { Rule } from "@/safety/types";

export const ACTION_LABEL: Record<Rule["action"], string> = {
  exclude: "Dish is left out",
  warn: "Dish shown with a caution",
  swap: "A swap is suggested",
};

export const ACTION_ICON: Record<Rule["action"], string> = { exclude: "✕", warn: "!", swap: "↔" };

export function ruleNumber(r: Rule): number {
  return Number(r.id.slice(1));
}
