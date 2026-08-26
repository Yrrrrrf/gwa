import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, type PluginOption } from "vite-plus";

export default defineConfig({
	plugins: [
		svelte({
			configFile: false,
			compilerOptions: {
				runes: true,
			},
		}) as unknown as PluginOption,
	],
	test: {
		globals: true,
		projects: ["./sdk/*/vite.config.ts", "./apps/*/vite.config.*"],
		exclude: [
			"**/node_modules/**",
			"**/.git/**",
			"**/.svelte-kit/**",
			"**/dist/**",
			"**/build/**",
		],
	},
});
