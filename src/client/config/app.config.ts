import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type PluginOption, type UserConfig } from "vite-plus";

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

	return defineConfig(async () => {
		const tw = tailwindcss() as PluginOption;
		const sk = (await sveltekit({
			adapter: adapter({
				fallback,
				strict: true,
			}),
		})) as PluginOption[];

		return {
			resolve: {
				alias: [
					{ find: /^#lib\/(.*)/, replacement: "/src/lib/$1" },
					{ find: "#lib", replacement: "/src/lib/mod.ts" },
				],
			},
			plugins: [tw, ...sk, ...extraPlugins],
			...overrides,
		};
	});
}

export default defineGWA();
