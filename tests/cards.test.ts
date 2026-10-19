import { describe, expect, it } from "vitest";
import { MENUS } from "../src/data/menus";
import { dishEmoji } from "../src/lib/dish-icons";
import { RULE_PREVIEW, previewFor } from "../src/lib/rule-preview";
import { EXAMPLES, toDemoPerson } from "../src/lib/profile";
import { evaluateDish, getActiveRules } from "../src/safety";

const active = getActiveRules();
const margaret = toDemoPerson(EXAMPLES.find((e) => e.id === "margaret")!.profile).profile;

describe("dish emoji", () => {
  it("picks a fitting icon and falls back to a plate", () => {
    expect(dishEmoji("Thin-crust pizza with salami")).toBe("🍕");
    expect(dishEmoji("Slow-cooked beef ragu with pasta")).toBe("🍝");
    expect(dishEmoji("Miso soup with tofu")).toBe("🥣");
    expect(dishEmoji("Mystery special")).toBe("🍽️");
  });

  it("gives every menu dish an icon", () => {
    for (const dishes of Object.values(MENUS)) for (const d of dishes) expect(dishEmoji(d.name, d.tags).length).toBeGreaterThan(0);
  });
});

describe("one-line reason preview", () => {
  it("has a preview for every active rule, so no card shows a placeholder", () => {
    for (const r of active.rules) expect(RULE_PREVIEW[r.id], r.id).toBeTruthy();
  });

  it("shows topic and person, e.g. 'Vitamin K · warfarin', with a count of the others", () => {
    const v = evaluateDish({ name: "Spinach cannelloni", tags: ["spinach"] }, margaret, active);
    expect(v.findings.map((f) => f.ruleId).sort()).toEqual(["R04", "R11"]);
    expect(previewFor(v.findings)).toBe("Vitamin K · warfarin · +1 more");
  });

  it("leads with the most serious finding", () => {
    const v = evaluateDish({ name: "Grapefruit tiramisu", tags: ["grapefruit", "alcohol-soaked"] }, margaret, active);
    expect(v.status).toBe("blocked");
    expect(previewFor(v.findings).startsWith("Grapefruit · statins")).toBe(true);
  });

  it("is empty when no rule applied", () => {
    expect(previewFor([])).toBe("");
  });
});
