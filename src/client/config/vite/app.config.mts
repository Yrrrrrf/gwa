import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type PluginOption, type UserConfig } from "vite-plus";

export interface GwaAppOptions {
	fallback?: string;
	extraPlugins?: PluginOption[];
	overrides?: UserConfig;
}

export function defineGwaApp(options: GwaAppOptions = {}) {
	const {
		fallback = "index.html",
		extraPlugins = [],
		overrides = {},
	} = options;

	const tw = tailwindcss() as unknown as PluginOption;
	const sk = sveltekit({
		compilerOptions: {
			runes: ({ filename }: { filename: string }) =>
				filename.split(/[/\\]/).includes("node_modules") ? undefined : true,
		},
		adapter: adapter({
			fallback,
			strict: true,
		}),
	}) as unknown as PluginOption;

	return defineConfig({
		plugins: [tw, sk, ...extraPlugins],
		...overrides,
	});
}

export default defineGwaApp();
