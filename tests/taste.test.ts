import { describe, expect, it } from "vitest";
import { DEMO_PEOPLE } from "../src/data/demo-profiles";
import { MENUS } from "../src/data/menus";
import { MockTasteProvider } from "../src/taste/mock-taste-provider";
import { SIMULATED_BANNER, getTasteProvider } from "../src/taste";

describe("mock taste provider", () => {
  it("is labelled as simulated and never claims to be Qloo", async () => {
    const provider = getTasteProvider();
    expect(provider.simulated).toBe(true);
    expect(SIMULATED_BANNER).toContain("NOT QLOO");
    const places = await provider.recommendPlaces(DEMO_PEOPLE[0].taste);
    expect(places.length).toBeGreaterThan(0);
    for (const p of places) {
      expect(p.source).toBe("SIMULATED");
      expect(p.name).toContain("fictional");
    }
  });

  it("ranks liked cuisines first and filters by cuisine", async () => {
    const provider = new MockTasteProvider();
    const places = await provider.recommendPlaces(DEMO_PEOPLE[0].taste, { take: 7 });
    expect(["italian", "greek"]).toContain(places[0].cuisine);
    const indian = await provider.recommendPlaces(DEMO_PEOPLE[0].taste, { cuisine: "indian" });
    expect(indian.every((p) => p.cuisine === "indian")).toBe(true);
  });

  it("only returns cuisines that have a fictional menu", async () => {
    const provider = new MockTasteProvider();
    const places = await provider.recommendPlaces(DEMO_PEOPLE[0].taste, { take: 20 });
    for (const p of places) expect(MENUS[p.cuisine]?.length).toBeGreaterThan(0);
  });
});
