import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      fallback: "index.html",
      strict: true,
    }),
    alias: {
      "@sdk/ui": "../../sdk/ui/src/mod.ts",
      "@sdk/core": "../../sdk/core/src/mod.ts",
      "@sdk/state": "../../sdk/state/src/mod.ts",
    },
  },
};

export default config;
