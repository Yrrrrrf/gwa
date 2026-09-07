import vue from "@vitejs/plugin-vue";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import type { PluginOption } from "vite-plus";
import { defineGWA } from "../../config/app.config.ts";

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
