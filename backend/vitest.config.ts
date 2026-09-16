import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",

    /**
     * Run test files sequentially.
     *
     * Our integration tests use the same PostgreSQL database,
     * so sequential execution avoids tests interfering with
     * each other's database state.
     */
    sequence: {
      concurrent: false,
    },

    /**
     * Give database/API integration tests enough time
     * to complete.
     */
    testTimeout: 30000,
  },
});