import ruleFile from "../../rules/safety-rules.json";
import groupFile from "../../rules/medicine-groups.json";
import { loadActiveRules } from "./engine";
import type { GroupFile, RuleFile } from "./types";

export * from "./engine";
export * from "./types";

/** Rules and groups the reviewer has approved. Unreviewed ones are listed in `inactive`. */
export function getActiveRules() {
  return loadActiveRules(ruleFile as unknown as RuleFile, groupFile as unknown as GroupFile);
}
