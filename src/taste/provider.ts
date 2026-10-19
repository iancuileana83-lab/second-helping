/** What the app knows about a person's taste. Fictional in this demo. */
export interface TasteProfile {
  likedCuisines: string[];
  likedPlaces: string[];
  likedDishes: string[];
  location: { lat: number; lon: number };
}

export interface Place {
  id: string;
  name: string;
  cuisine: string;
  /** 0 to 1, higher means a closer match to the person's taste. */
  score: number;
  /** Plain-language reason shown to the family. */
  reason: string;
  /** Where the ranking came from. The UI shows this on every card. */
  source: "SIMULATED" | "QLOO";
}

export interface RecommendOptions {
  cuisine?: string;
  take?: number;
}

/**
 * The only thing the rest of the app knows about taste ranking.
 * MockTasteProvider is the stand-in. The real Qloo client will implement the same interface.
 */
export interface TasteProvider {
  readonly name: string;
  readonly simulated: boolean;
  recommendPlaces(taste: TasteProfile, options?: RecommendOptions): Promise<Place[]>;
}

export const SIMULATED_BANNER = "SIMULATED TASTE DATA, NOT QLOO";
