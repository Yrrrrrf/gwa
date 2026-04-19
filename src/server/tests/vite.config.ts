import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    globalSetup: "./globalSetup.ts",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**"],
  },
});
