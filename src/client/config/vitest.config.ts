import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, type PluginOption } from "vite-plus";
import { createLibAliases, discoverDirs } from "./_shared.ts";

const svelteProject = (
	name: string,
	root: string,
	extraPlugins: PluginOption[] = [],
) => ({
	root: `${root}/${name}`,
	resolve: {
		alias: createLibAliases(`${root}/${name}`),
	},
	plugins: [
		svelte({
			configFile: false,
			compilerOptions: {
				runes: true,
			},
		}) as PluginOption,
		...extraPlugins,
	],
	test: {
		name,
		globals: true,
		exclude: [
			"**/node_modules/**",
			"**/.git/**",
			"**/.svelte-kit/**",
			"**/dist/**",
			"**/build/**",
		],
	},
});

export default defineConfig({
	plugins: [
		svelte({
			compilerOptions: {
				runes: true,
			},
		}) as unknown as PluginOption,
	],
	test: {
		projects: [
			...discoverDirs("./sdk").map((name) => svelteProject(name, "./sdk")),
			...discoverDirs("./apps").map((name) => svelteProject(name, "./apps")),
		] as unknown as string[],
	},
});
