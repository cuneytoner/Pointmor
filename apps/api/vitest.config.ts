import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["src/test-env.ts"],
    environment: "node",
    pool: "forks",
    include: ["src/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
