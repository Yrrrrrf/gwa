import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type PluginOption, type UserConfig } from "vite-plus";

const SDK_ROOT = new URL("../sdk", import.meta.url).pathname;
const SDK_ENTRY = new URL("../sdk/mod.ts", import.meta.url).pathname;

export interface GwaConfig {
	plugins?: PluginOption[];
	extraPlugins?: PluginOption[];
	overrides?: UserConfig;
}

export function defineGWA(options: GwaConfig = {}) {
	const { plugins = [], extraPlugins = [], overrides = {} } = options;

	return defineConfig({
		resolve: {
			alias: [
				{ find: /^@sdk\/([^/]+)$/, replacement: `${SDK_ROOT}/$1/src/mod.ts` },
				{ find: /^@sdk\/(.*)/, replacement: `${SDK_ROOT}/$1` },
				{ find: /^@sdk$/, replacement: SDK_ENTRY },
				{ find: /^#lib\/(.*)/, replacement: "/src/lib/$1" },
				{ find: /^#lib$/, replacement: "/src/lib/mod.ts" },
			],
		},
		plugins: [tailwindcss() as PluginOption, ...plugins, ...extraPlugins],
		...overrides,
	});
}

export default defineGWA();
