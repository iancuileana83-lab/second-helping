import { MockTasteProvider } from "./mock-taste-provider";
import type {
  CuisineAffinity,
  Place,
  RecommendOptions,
  TasteProfile,
  TasteProvider,
  TasteSource,
  TasteSourceInfo,
} from "./provider";
import { QlooTasteProvider, qlooConfigFromEnv } from "./qloo-provider";

export * from "./provider";
export { MockTasteProvider } from "./mock-taste-provider";

/** True when a Qloo key is set. Without it the app uses the labelled stand-in everywhere. */
export function qlooConfigured(): boolean {
  return qlooConfigFromEnv() !== null;
}

/**
 * Tries Qloo first. If Qloo fails for any reason (timeout, rate limit, error), it falls back to the
 * simulated provider for that request. Every result carries its own `source`, so the UI labels it truthfully.
 */
export class ResilientTasteProvider implements TasteProvider {
  readonly name = "Qloo taste graph (simulated fallback if unavailable)";
  readonly simulated = false;

  constructor(
    private readonly qloo: TasteProvider,
    private readonly fallback: TasteProvider,
  ) {}

  private warn(err: unknown) {
    console.warn("[taste] Qloo unavailable, using simulated data:", err instanceof Error ? err.message : "error");
  }

  async recommendPlaces(taste: TasteProfile, options?: RecommendOptions): Promise<Place[]> {
    try {
      // An empty list means Qloo answered but found nothing nearby; that is reported honestly, not replaced.
      return await this.qloo.recommendPlaces(taste, options);
    } catch (err) {
      this.warn(err);
    }
    return this.fallback.recommendPlaces(taste, options);
  }

  async cuisineAffinities(taste: TasteProfile): Promise<CuisineAffinity[]> {
    try {
      return await this.qloo.cuisineAffinities(taste);
    } catch (err) {
      this.warn(err);
      return this.fallback.cuisineAffinities(taste);
    }
  }
}

export function getTasteProvider(): TasteProvider {
  const config = qlooConfigFromEnv();
  if (!config) return new MockTasteProvider();
  return new ResilientTasteProvider(new QlooTasteProvider(config), new MockTasteProvider());
}

/** Describes where a result's taste data came from, for labels. */
export function tasteSourceFor(sources: TasteSource[]): TasteSourceInfo {
  const configured = qlooConfigured();
  const simulated = sources.length === 0 ? !configured : sources.some((s) => s === "SIMULATED");
  return {
    name: simulated ? "Simulated taste provider (stand-in for Qloo)" : "Qloo taste graph",
    simulated,
    fallback: simulated && configured,
  };
}
