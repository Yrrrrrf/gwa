import vue from "@vitejs/plugin-vue";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineGWA, type PluginOption } from "../../config/app.config.ts";

export default defineGWA({
	plugins: [
		vue() as PluginOption,
		svelte({
			compilerOptions: {
				runes: true,
			},
		}) as PluginOption,
	],
});
