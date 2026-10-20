/** What the app knows about a person's taste. Fictional in this demo. */
export interface TasteProfile {
  likedCuisines: string[];
  likedPlaces: string[];
  likedDishes: string[];
  /** Where to look for restaurants. One of the fixed city presets. */
  location: { lat: number; lon: number };
}

export type TasteSource = "SIMULATED" | "QLOO";

export interface Place {
  id: string;
  name: string;
  cuisine: string;
  /** 0 to 1, higher means a closer match to the person's taste. For Qloo this is its affinity. */
  score: number;
  /** Plain-language reason shown to the family. */
  reason: string;
  /** Where the ranking came from. The UI shows this on every card. */
  source: TasteSource;
  /** Real-restaurant details, present only for Qloo places. */
  address?: string;
  rating?: number;
  distanceKm?: number;
  website?: string;
}

/** How strongly one cuisine matches the person's taste. */
export interface CuisineAffinity {
  cuisine: string;
  score: number;
  /** False for cuisines the person did not choose; those are only used to fill gaps. */
  favourite: boolean;
  reason: string;
  source: TasteSource;
}

export interface RecommendOptions {
  cuisine?: string;
  take?: number;
}

/**
 * The only thing the rest of the app knows about taste ranking.
 * MockTasteProvider is the labelled stand-in. QlooTasteProvider is the real one.
 */
export interface TasteProvider {
  readonly name: string;
  /** True only for the stand-in. Results also carry their own `source`. */
  readonly simulated: boolean;
  recommendPlaces(taste: TasteProfile, options?: RecommendOptions): Promise<Place[]>;
  cuisineAffinities(taste: TasteProfile): Promise<CuisineAffinity[]>;
}

/** Where a result's taste data came from, for the labels in the UI. */
export interface TasteSourceInfo {
  name: string;
  simulated: boolean;
  /** True when Qloo is set up but its data could not be used, so made-up data was shown instead. */
  fallback: boolean;
}

export const SIMULATED_BANNER = "SIMULATED TASTE DATA, NOT QLOO";

/** Search radius around the chosen city centre. */
export const SEARCH_RADIUS_M = 5000;
