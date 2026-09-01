import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineGWA, type PluginOption } from "../../config/app.config.ts";

export default defineGWA({
	plugins: [
		sveltekit({
			adapter: adapter({
				fallback: "index.html",
				strict: true,
			}),
		}) as PluginOption,
	],
});
