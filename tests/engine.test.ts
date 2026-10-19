import { describe, expect, it } from "vitest";
import ruleFileJson from "../rules/safety-rules.json";
import groupFileJson from "../rules/medicine-groups.json";
import { evaluateDish, loadActiveRules, screenDishes } from "../src/safety/engine";
import type { Dish, GroupFile, Profile, RuleFile } from "../src/safety/types";

const realRules = ruleFileJson as unknown as RuleFile;
const realGroups = groupFileJson as unknown as GroupFile;

/** TEST ONLY: pretend the reviewer approved everything, to test the real keywords. */
function everythingApproved() {
  const rules: RuleFile = { ...realRules, rules: realRules.rules.map((r) => ({ ...r, reviewed: true })) };
  const groups: GroupFile = {
    ...realGroups,
    groups: Object.fromEntries(Object.entries(realGroups.groups).map(([k, g]) => [k, { ...g, reviewed: true }])),
  };
  return loadActiveRules(rules, groups);
}

const active = everythingApproved();

function person(partial: Partial<Profile>): Profile {
  return { name: "Test (fictional)", medicines: [], conditions: [], needs: [], ...partial };
}
function dish(name: string, tags: string[] = [], meal?: Dish["meal"]): Dish {
  return { name, tags, meal };
}
const ids = (v: ReturnType<typeof evaluateDish>) => v.findings.map((f) => f.ruleId);

describe("review gate", () => {
  it("does not use a rule that is not reviewed", () => {
    const a = loadActiveRules(
      { ...realRules, rules: realRules.rules.map((r) => ({ ...r, reviewed: false })) },
      { ...realGroups, groups: everythingGroups() },
    );
    expect(a.rules).toHaveLength(0);
    expect(a.inactive).toHaveLength(realRules.rules.length);
  });

  it("does not use a reviewed rule whose medicine group is not reviewed", () => {
    const rules: RuleFile = { ...realRules, rules: realRules.rules.map((r) => ({ ...r, reviewed: true })) };
    const groups: GroupFile = {
      ...realGroups,
      groups: { ...everythingGroups(), statins_grapefruit: { ...realGroups.groups.statins_grapefruit, reviewed: false } },
    };
    const a = loadActiveRules(rules, groups);
    expect(a.rules.find((r) => r.id === "R01")).toBeUndefined();
    expect(a.inactive.find((i) => i.ruleId === "R01")?.reason).toContain("statins_grapefruit");
  });

  it("with the real files, every active rule is reviewed and uses only reviewed groups", () => {
    const real = loadActiveRules(realRules, realGroups);
    for (const r of real.rules) {
      expect(r.reviewed).toBe(true);
      for (const c of r.applies_when.any_of) {
        if ("group" in c) expect(realGroups.groups[c.group]?.reviewed).toBe(true);
      }
    }
  });
});

function everythingGroups(): GroupFile["groups"] {
  return Object.fromEntries(Object.entries(realGroups.groups).map(([k, g]) => [k, { ...g, reviewed: true }]));
}

describe("rule file integrity", () => {
  it("has unique ids, valid actions, keywords, and known groups", () => {
    const seen = new Set<string>();
    for (const r of realRules.rules) {
      expect(seen.has(r.id)).toBe(false);
      seen.add(r.id);
      expect(["exclude", "warn", "swap"]).toContain(r.action);
      expect(r.keywords.length + (r.meals?.length ?? 0)).toBeGreaterThan(0);
      expect(r.source.length).toBeGreaterThan(0);
      for (const c of r.applies_when.any_of) {
        if ("group" in c) expect(realGroups.groups[c.group], `${r.id} -> ${c.group}`).toBeDefined();
      }
      if (r.reviewed) expect(r.reviewed_by).toBeTruthy();
    }
  });

  it("applies the reviewer's decisions: 5, 8, 11, 12 are WARN", () => {
    for (const id of ["R05", "R08", "R11", "R12"]) {
      expect(realRules.rules.find((r) => r.id === id)?.action).toBe("warn");
    }
  });

  it("has removed rule 14, as the reviewer decided (replaced by 21 and 22)", () => {
    expect(realRules.rules.find((r) => r.id === "R14")).toBeUndefined();
  });

  it("has rules 21 and 22 approved by the reviewer, and every group approved", () => {
    for (const id of ["R21", "R22"]) {
      expect(realRules.rules.find((r) => r.id === id)?.reviewed).toBe(true);
    }
    for (const g of Object.values(realGroups.groups)) expect(g.reviewed).toBe(true);
  });

  it("activates every real rule with the real files and no overrides", () => {
    const real = loadActiveRules(realRules, realGroups);
    expect(real.inactive).toEqual([]);
    expect(real.rules).toHaveLength(realRules.rules.length);
  });
});

describe("drug-food rules", () => {
  it("excludes grapefruit for a statin user, case-insensitively", () => {
    const v = evaluateDish(dish("Grapefruit and avocado salad", ["grapefruit"]), person({ medicines: ["Simvastatin "] }), active);
    expect(v.status).toBe("blocked");
    expect(ids(v)).toContain("R01");
  });

  it("does not flag grapefruit for someone not on an affected medicine", () => {
    const v = evaluateDish(dish("Grapefruit", ["grapefruit"]), person({ medicines: ["paracetamol"] }), active);
    expect(v.status).toBe("ok");
  });

  it("only warns for greens with warfarin and never excludes", () => {
    const v = evaluateDish(dish("Spinach and ricotta cannelloni", ["spinach"]), person({ medicines: ["warfarin"] }), active);
    expect(v.status).toBe("warn");
    expect(ids(v)).toEqual(["R04"]);
  });

  it("excludes alcohol-served dishes for sedatives but only warns when cooked with alcohol", () => {
    const p = person({ medicines: ["temazepam"] });
    expect(evaluateDish(dish("Tiramisu", ["alcohol-soaked"]), p, active).status).toBe("blocked");
    const cooked = evaluateDish(dish("Risotto", ["alcohol-cooked"]), p, active);
    expect(cooked.status).toBe("warn");
    expect(ids(cooked)).toEqual(["R08"]);
  });

  it("warns (not excludes) for high-tyramine foods with an MAOI", () => {
    const v = evaluateDish(dish("Miso soup", ["miso"]), person({ medicines: ["phenelzine"] }), active);
    expect(v.status).toBe("warn");
  });

  it("excludes potassium salt substitutes with an ACE inhibitor", () => {
    const v = evaluateDish(dish("Seasoned chips", ["LoSalt"]), person({ medicines: ["ramipril"] }), active);
    expect(v.status).toBe("blocked");
    expect(ids(v)).toContain("R10");
  });

  it("warns on liquorice with a water tablet", () => {
    const v = evaluateDish(dish("Liquorice allsorts"), person({ medicines: ["furosemide"] }), active);
    expect(ids(v)).toContain("R13");
  });

  it("warns about breakfast and coffee for levothyroxine (R22) and dairy with doxycycline (R21)", () => {
    const l = evaluateDish(dish("Porridge", [], "breakfast"), person({ medicines: ["levothyroxine"] }), active);
    expect(ids(l)).toContain("R22");
    const d = evaluateDish(dish("Yoghurt pot", ["yoghurt"]), person({ medicines: ["doxycycline"] }), active);
    expect(ids(d)).toContain("R21");
  });
});

describe("alcohol and warfarin (rule 23)", () => {
  const warfarin = person({ medicines: ["warfarin"] });
  const r23 = (name: string, tags: string[]) => evaluateDish(dish(name, tags), warfarin, active);

  it("warns, and never excludes, for dishes cooked with wine", () => {
    const v = r23("Risotto with white wine", ["alcohol-cooked", "rice"]);
    expect(v.status).toBe("warn");
    expect(ids(v)).toContain("R23");
  });

  it("matches wine by name even when the dish is not tagged", () => {
    expect(ids(r23("Chicken braised in red wine", []))).toContain("R23");
  });

  it("warns for tiramisu made with liqueur or marsala", () => {
    expect(ids(r23("Tiramisu", ["alcohol-soaked"]))).toContain("R23");
    expect(ids(r23("Tiramisu with marsala", []))).toContain("R23");
    expect(ids(r23("Orange liqueur sponge", []))).toContain("R23");
  });

  it("warns for alcoholic drinks and uses the reviewer's wording", () => {
    const v = r23("Glass of beer", ["alcoholic-drink"]);
    expect(v.status).toBe("warn");
    expect(v.findings.find((f) => f.ruleId === "R23")?.message).toContain(
      "Alcohol can change how warfarin works and affect the INR.",
    );
  });

  it("does not fire without warfarin, and does not fire on plain dishes", () => {
    expect(ids(evaluateDish(dish("Risotto with white wine", ["alcohol-cooked"]), person({}), active))).not.toContain("R23");
    expect(ids(r23("Plain risotto", ["rice"]))).not.toContain("R23");
  });

  it("is marked reviewed by the pharmacy assistant and stays a WARN", () => {
    const rule = realRules.rules.find((r) => r.id === "R23");
    expect(rule?.action).toBe("warn");
    expect(rule?.reviewed).toBe(true);
    expect(rule?.reviewed_by).toContain("Pharmacy assistant");
  });
});

describe("condition and texture rules", () => {
  it("warns on salty dishes for hypertension", () => {
    const v = evaluateDish(dish("Bacon roll", ["bacon"]), person({ conditions: ["hypertension"] }), active);
    expect(ids(v)).toContain("R09");
  });

  it("suggests a swap for tough meat when easy-to-chew is needed", () => {
    const v = evaluateDish(dish("Sirloin steak"), person({ needs: ["easy_to_chew"] }), active);
    expect(v.status).toBe("swap");
    expect(v.findings[0].swap).toBeTruthy();
  });

  it("excludes peanuts for easy-to-chew, matching plurals", () => {
    const v = evaluateDish(dish("Salted peanuts"), person({ needs: ["easy_to_chew"] }), active);
    expect(v.status).toBe("blocked");
  });

  it("applies the strictest outcome when several rules match", () => {
    const v = evaluateDish(
      dish("Crunchy bacon crackers", ["bacon", "crunchy"]),
      person({ conditions: ["hypertension"], needs: ["easy_to_chew"] }),
      active,
    );
    expect(v.status).toBe("blocked");
    expect(ids(v)).toEqual(expect.arrayContaining(["R09", "R16"]));
  });
});

describe("matching is whole-term", () => {
  it("does not match 'ham' inside 'hamburger'", () => {
    const v = evaluateDish(dish("Hamburger"), person({ conditions: ["hypertension"] }), active);
    expect(v.status).toBe("ok");
  });

  it("does not treat 'milk-free' as milk", () => {
    const v = evaluateDish(dish("Milk-free dessert bar"), person({ medicines: ["doxycycline"] }), active);
    expect(ids(v)).not.toContain("R21");
  });
});

describe("messages", () => {
  it("ends every finding with the ask-your-pharmacist line, exactly once", () => {
    const v = evaluateDish(
      dish("Grapefruit", ["grapefruit"]),
      person({ medicines: ["simvastatin", "ciclosporin"] }),
      active,
    );
    expect(v.findings.length).toBeGreaterThanOrEqual(2);
    for (const f of v.findings) {
      expect(f.message.toLowerCase()).toContain("ask your pharmacist or doctor");
      expect(f.message.toLowerCase().split("ask your pharmacist or doctor").length - 1).toBe(1);
    }
  });
});

describe("end to end with the real approved files", () => {
  it("screens a fictional person's menu using no test overrides", () => {
    const real = loadActiveRules(realRules, realGroups);
    const margaret = person({ medicines: ["simvastatin", "ramipril", "warfarin"], conditions: ["hypertension"] });
    const s = screenDishes(
      [
        dish("Grapefruit sorbet", ["grapefruit"]),
        dish("Spinach cannelloni", ["spinach"]),
        dish("Plain pasta", ["pasta"]),
      ],
      margaret,
      real,
    );
    expect(s.excluded.map((v) => v.dish.name)).toEqual(["Grapefruit sorbet"]);
    expect(s.shown.find((v) => v.dish.name === "Spinach cannelloni")?.status).toBe("warn");
    expect(s.shown.find((v) => v.dish.name === "Plain pasta")?.status).toBe("ok");
  });
});

describe("screening", () => {
  it("accounts for every dish: shown or excluded with reasons", () => {
    const dishes = [dish("Grapefruit", ["grapefruit"]), dish("Plain rice", ["rice"]), dish("Spinach", ["spinach"])];
    const s = screenDishes(dishes, person({ medicines: ["simvastatin", "warfarin"] }), active);
    expect(s.shown.length + s.excluded.length).toBe(dishes.length);
    expect(s.excluded.map((v) => v.dish.name)).toEqual(["Grapefruit"]);
    expect(s.excluded[0].findings.length).toBeGreaterThan(0);
  });
});
