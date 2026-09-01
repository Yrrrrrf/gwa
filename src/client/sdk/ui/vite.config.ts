import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type PluginOption } from "vite-plus";

export default defineConfig({
	plugins: [
		tailwindcss() as PluginOption,
		svelte({
			compilerOptions: {
				runes: true,
			},
		}) as PluginOption,
	],
});
