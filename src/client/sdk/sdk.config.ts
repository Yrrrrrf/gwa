import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type PluginOption, type UserConfig } from "vite-plus";

export interface GwaPkg {
	extraPlugins?: PluginOption[];
	overrides?: UserConfig;
}

export function defineSveltePkg(options: GwaPkg = {}) {
	const { extraPlugins = [], overrides = {} } = options;

	return defineConfig({
		plugins: [
			tailwindcss() as PluginOption,
			svelte({
				configFile: false,
				compilerOptions: {
					runes: true,
				},
			}) as PluginOption,
			...extraPlugins,
		],
		...overrides,
	});
}
