import { describe, expect, it } from "vitest";
import { ILLUSTRATIVE_SUGGESTIONS, compareIllustrative } from "../src/lib/compare";
import { tasteAffinity } from "../src/lib/meals";
import { EXAMPLES, toDemoPerson, type UserProfile } from "../src/lib/profile";

const margaret = EXAMPLES.find((e) => e.id === "margaret")!.profile;
const rosa: UserProfile = { name: "Rosa", cuisines: ["italian"], dishes: [], medicineGroups: [], conditions: [], needs: [] };

describe("generic AI vs SafePlate comparison", () => {
  it("for Margaret, grapefruit juice is excluded by the statin rule, with the real rule number", () => {
    const rows = compareIllustrative(margaret, 10);
    const g = rows.find((r) => r.verdict.dish.name.startsWith("Grapefruit"));
    expect(g?.verdict.status).toBe("blocked");
    expect(g?.verdict.findings.map((f) => f.ruleId)).toContain("R01");
    expect(g?.verdict.findings[0].message.toLowerCase()).toContain("ask your pharmacist or doctor");
  });

  it("flags tiramisu with marsala for warfarin as a caution, never as an exclusion", () => {
    const t = compareIllustrative(margaret, 10).find((r) => r.verdict.dish.name.includes("Tiramisu"));
    expect(t?.verdict.status).toBe("warn");
    expect(t?.verdict.findings.map((f) => f.ruleId)).toContain("R23");
  });

  it("shows nothing for a person the examples do not affect, and never shows 'ok' rows", () => {
    expect(compareIllustrative(rosa)).toEqual([]);
    for (const r of compareIllustrative(margaret, 10)) expect(r.verdict.status).not.toBe("ok");
  });

  it("keeps the generic side clearly illustrative: every example has invented wording and tags", () => {
    expect(ILLUSTRATIVE_SUGGESTIONS.length).toBeGreaterThanOrEqual(4);
    for (const s of ILLUSTRATIVE_SUGGESTIONS) expect(s.chatbotSays.length).toBeGreaterThan(10);
  });
});

describe("taste map affinity", () => {
  it("returns only favourite cuisines, strongest first, labelled simulated", async () => {
    const a = await tasteAffinity(toDemoPerson({ ...rosa, cuisines: ["italian", "greek", "indian"], dishes: ["pasta"] }));
    expect(a.tasteSource.simulated).toBe(true);
    expect(a.cuisines.map((c) => c.cuisine).sort()).toEqual(["greek", "indian", "italian"]);
    const scores = a.cuisines.map((c) => c.score);
    expect(scores).toEqual([...scores].sort((x, y) => y - x));
    for (const c of a.cuisines) expect(c.score).toBeGreaterThan(0);
  });

  it("makes a cuisine grow when a matching favourite dish is added", async () => {
    const without = await tasteAffinity(toDemoPerson({ ...rosa, dishes: [] }));
    const withDish = await tasteAffinity(toDemoPerson({ ...rosa, dishes: ["pasta"] }));
    expect(withDish.cuisines[0].score).toBeGreaterThan(without.cuisines[0].score);
  });
});
