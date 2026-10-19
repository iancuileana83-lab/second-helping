export type Action = "exclude" | "warn" | "swap";
export type Status = "ok" | "warn" | "swap" | "blocked";

export type Condition = "hypertension" | "heart_failure" | "kidney_disease" | "diabetes";
export type Need = "easy_to_chew" | "dysphagia" | "dry_mouth";
export type Meal = "breakfast" | "lunch" | "dinner" | "snack";

export type Clause = { group: string } | { condition: Condition } | { need: Need };

export interface Rule {
  id: string;
  category: string;
  food: string[];
  keywords: string[];
  meals?: Meal[];
  medicine_group: string;
  applies_when: { any_of: Clause[] };
  action: Action;
  message: string;
  swap?: string;
  source: string;
  review_note?: string;
  reviewed: boolean;
  reviewed_by?: string;
  reviewed_on?: string;
}

export interface RuleFile {
  version: string;
  ask_line: string;
  rules: Rule[];
}

export interface MedicineGroup {
  label: string;
  members: string[];
  reviewed: boolean;
}

export interface GroupFile {
  version: string;
  groups: Record<string, MedicineGroup>;
}

/** A fictional person. Medicines are generic names. */
export interface Profile {
  name: string;
  /** Generic medicine names. */
  medicines: string[];
  /** Whole medicine groups chosen by the user (ids from rules/medicine-groups.json). */
  medicineGroups?: string[];
  conditions: Condition[];
  needs: Need[];
}

/** One dish a place might serve. Terms are matched against rule keywords. */
export interface Dish {
  name: string;
  meal?: Meal;
  /** Ingredient and texture tags, e.g. "spinach", "high-salt", "crunchy". */
  tags: string[];
}

export interface Finding {
  ruleId: string;
  action: Action;
  message: string;
  swap?: string;
  matched: string[];
}

export interface Verdict {
  dish: Dish;
  status: Status;
  findings: Finding[];
}

export interface ActiveRules {
  rules: Rule[];
  groups: Record<string, MedicineGroup>;
  askLine: string;
  /** Rules that were not used and why, so nothing is silently dropped. */
  inactive: { ruleId: string; reason: string }[];
}
