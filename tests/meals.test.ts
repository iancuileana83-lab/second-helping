import { describe, expect, it } from "vitest";
import { homeIdeas, weeklyPlan } from "../src/lib/meals";
import { EXAMPLES, toDemoPerson } from "../src/lib/profile";

const people = EXAMPLES.map((e) => ({ id: e.id, person: toDemoPerson(e.profile, e.id) }));

describe("cook at home", () => {
  it("accounts for every dish in each cuisine and puts dishes with no concerns first", async () => {
    for (const { id, person } of people) {
      const ideas = await homeIdeas(person);
      expect(ideas.tasteSource.simulated, id).toBe(true);
      expect(ideas.cuisines.length, id).toBeGreaterThan(0);
      for (const c of ideas.cuisines) {
        const order = ["ok", "warn", "swap"];
        const ranks = c.shown.map((v) => order.indexOf(v.status));
        expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
        expect(c.excluded.every((v) => v.status === "blocked")).toBe(true);
      }
    }
  });
});

describe("weekly plan", () => {
  it("never includes a dish the rules exclude, for every example", async () => {
    for (const { id, person } of people) {
      const plan = await weeklyPlan(person);
      expect(plan.slots.length, id).toBeGreaterThan(0);
      for (const s of plan.slots) expect(s.verdict.status, `${id}: ${s.verdict.dish.name}`).not.toBe("blocked");
    }
  });

  it("does not repeat a dish and fills lunch then dinner per day", async () => {
    const plan = await weeklyPlan(people[0].person);
    const names = plan.slots.map((s) => s.verdict.dish.name);
    expect(new Set(names).size).toBe(names.length);
    expect(plan.slots[0]).toMatchObject({ day: "Monday", meal: "Lunch" });
    expect(plan.slots[1]).toMatchObject({ day: "Monday", meal: "Dinner" });
  });

  it("keeps every caution visible on the slot", async () => {
    const plan = await weeklyPlan(people[0].person);
    for (const s of plan.slots) {
      if (s.verdict.status !== "ok") expect(s.verdict.findings.length).toBeGreaterThan(0);
    }
  });

  it("tells the user when it cannot fill the week without repeats", async () => {
    const tiny = toDemoPerson({ name: "Rosa", cuisines: ["greek"], dishes: [], medicineGroups: [], conditions: [], needs: [] });
    const plan = await weeklyPlan(tiny);
    if (plan.slots.length < 14) expect(plan.notes.join(" ")).toContain("could be filled");
  });
});
