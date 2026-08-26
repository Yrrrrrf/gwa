import { existsSync, readdirSync } from "node:fs";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, type PluginOption } from "vite-plus";

const svelteProject = (
	name: string,
	root: string,
	extraPlugins: PluginOption[] = [],
) => ({
	root: `${root}/${name}`,
	resolve: {
		alias: {
			"#lib": `${process.cwd()}/${root}/${name}/src/lib`,
		},
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
		environment: "node",
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

function discoverProjects(dirPath: string) {
	if (!existsSync(dirPath)) return [];
	return readdirSync(dirPath, { withFileTypes: true })
		.filter((dirent) => dirent.isDirectory())
		.map((dirent) => svelteProject(dirent.name, dirPath));
}

export default defineConfig({
	plugins: [
		svelte({
			compilerOptions: {
				runes: true,
			},
		}),
	] as PluginOption[],
	test: {
		projects: [...discoverProjects("./sdk"), ...discoverProjects("./apps")],
	},
});
