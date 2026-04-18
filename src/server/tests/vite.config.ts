import { defineConfig } from "vite";

export default defineConfig({
  test: {
    // Vite-plus specific test configuration if needed
    // For now, we use Deno native test runner via 'deno task test'
    // but we keep this file as per the architectural spec.
    include: ["**/*.test.ts"],
    exclude: ["node_modules", "dist"],
  },
});
