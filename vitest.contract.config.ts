import { defineConfig } from "vitest/config";
import path from "node:path";

// Live provider contract tests — separate from the offline unit suite.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["tests/contract/**/*.test.ts"],
    testTimeout: 120000,
    hookTimeout: 60000,
  },
});
