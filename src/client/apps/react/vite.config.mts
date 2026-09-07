import react from "@vitejs/plugin-react";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineGWA, type PluginOption } from "../../config/app.config.ts";

export default defineGWA({
	plugins: [
		react() as PluginOption,
		svelte({
			compilerOptions: {
				runes: true,
			},
		}) as PluginOption,
	],
});
