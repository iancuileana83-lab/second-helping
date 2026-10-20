import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getPerson } from "../src/data/demo-profiles";
import { runAgent, wordingOk } from "../src/agent/run";

const KEY = "GOOGLE_GENERATIVE_AI_API_KEY";
let saved: string | undefined;
beforeEach(() => {
  saved = process.env[KEY];
  delete process.env[KEY];
});
afterEach(() => {
  if (saved !== undefined) process.env[KEY] = saved;
});

describe("agent without an AI key", () => {
  it("still returns a complete, labelled plan from the deterministic parts", async () => {
    const plan = await runAgent(getPerson("dorothy")!);
    expect(plan.tasteSource.simulated).toBe(true);
    expect(plan.wording).toBe("template");
    expect(plan.inactiveRules).toBe(0);
    expect(plan.places.length).toBeGreaterThan(0);
    for (const r of plan.places) {
      expect(r.place.source).toBe("SIMULATED");
      expect(r.why.length).toBeGreaterThan(0);
    }
  });

  it("shows the taste reason once in 'why this', with a capitalised cuisine", async () => {
    const plan = await runAgent(getPerson("margaret")!);
    for (const r of plan.places) {
      expect(r.why.match(/Simulated match/g)?.length ?? 0).toBe(1);
      expect(r.why).not.toMatch(/enjoy (italian|greek|british|indian|chinese|japanese) food/);
    }
  });

  it("the shortlist covers each favourite cuisine, not just the top scorer", async () => {
    const plan = await runAgent(getPerson("margaret")!);
    const cuisines = new Set(plan.places.map((p) => p.place.cuisine));
    expect(cuisines.has("italian")).toBe(true);
    expect(cuisines.has("greek")).toBe(true);
  });

  it("labels its taste data as simulated when Qloo is not set up", async () => {
    const plan = await runAgent(getPerson("margaret")!);
    expect(plan.tasteSource).toMatchObject({ simulated: true, fallback: false });
  });

  it("excludes small-bone fish for someone with swallowing difficulty, with a reason", async () => {
    const plan = await runAgent(getPerson("dorothy")!);
    const chinese = plan.places.find((p) => p.place.cuisine === "chinese")!;
    const fish = chinese.excluded.find((v) => v.dish.name.startsWith("Steamed fish"));
    expect(fish).toBeDefined();
    expect(fish!.findings.some((f) => f.ruleId === "R18")).toBe(true);
    expect(fish!.findings[0].message.toLowerCase()).toContain("ask your pharmacist or doctor");
  });

  it("accounts for every dish at each place (shown + excluded = whole menu)", async () => {
    const { MENUS } = await import("../src/data/menus");
    const plan = await runAgent(getPerson("george")!);
    for (const r of plan.places) {
      expect(r.shown.length + r.excluded.length).toBe(MENUS[r.place.cuisine].length);
    }
  });
});

describe("model wording check", () => {
  it("rejects the dropped-verb slip and clearance words, and accepts a correct sentence", () => {
    expect(wordingOk("A great match because they enjoy Greek cuisine and it conveniently close by.")).toBe(false);
    expect(wordingOk("A great match because they enjoy Greek cuisine and it is conveniently close by.")).toBe(true);
    expect(wordingOk("This place is safe for them.")).toBe(false);
  });
});
