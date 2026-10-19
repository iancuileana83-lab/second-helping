import { MockTasteProvider } from "./mock-taste-provider";
import type { TasteProvider } from "./provider";

export * from "./provider";
export { MockTasteProvider } from "./mock-taste-provider";

/**
 * Chooses the taste provider. The real Qloo client is not written yet, so this always
 * returns the labelled stand-in. When it exists it will be chosen if QLOO_API_KEY is set.
 */
export function getTasteProvider(): TasteProvider {
  return new MockTasteProvider();
}
