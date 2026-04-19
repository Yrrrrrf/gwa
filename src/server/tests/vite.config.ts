import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["@testing-library/jest-dom/vitest"],
  },
});
