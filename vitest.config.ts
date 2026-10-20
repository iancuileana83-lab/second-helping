import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["tests/**/*.test.ts"],
    // Tests never use a real key: the simulated provider is used unless a test sets these itself.
    env: { QLOO_API_KEY: "", QLOO_BASE_URL: "", GOOGLE_GENERATIVE_AI_API_KEY: "" },
  },
});
