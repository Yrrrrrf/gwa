import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type PluginOption, type UserConfig } from "vite-plus";

const SDK_ROOT = new URL("../sdk", import.meta.url).pathname;
const SDK_ENTRY = new URL("../sdk/mod.ts", import.meta.url).pathname;

export interface GwaConfig {
	fallback?: string;
	extraPlugins?: PluginOption[];
	overrides?: UserConfig;
}

export function defineGWA(options: GwaConfig = {}) {
	const {
		fallback = "index.html",
		extraPlugins = [],
		overrides = {},
	} = options;

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
		plugins: [
			tailwindcss() as PluginOption,
			sveltekit({
				adapter: adapter({
					fallback,
					strict: true,
				}),
			}) as unknown as PluginOption,
			...extraPlugins,
		],
		...overrides,
	});
}

export default defineGWA();
