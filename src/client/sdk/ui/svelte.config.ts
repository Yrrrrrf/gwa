import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			fallback: "index.html",
			strict: false,
		}),
		alias: {
			"@sdk/core": "../core/src/mod.ts",
			"@sdk/state": "../state/src/mod.ts",
			"@sdk/ui": "./src/mod.ts",
		},
	},
};

export default config;
