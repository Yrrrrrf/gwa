import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type PluginOption, type UserConfig } from "vite-plus";

export interface GwaApp {
	fallback?: string;
	extraPlugins?: PluginOption[];
	overrides?: UserConfig;
}

export function defineGwaApp(options: GwaApp = {}) {
	const {
		fallback = "index.html",
		extraPlugins = [],
		overrides = {},
	} = options;

	return defineConfig(async () => {
		const tw = tailwindcss() as PluginOption;
		const sk = (await sveltekit({
			compilerOptions: {
				runes: ({ filename }: { filename: string }) =>
					filename.split(/[/\\]/).includes("node_modules") ? undefined : true,
			},
			adapter: adapter({
				fallback,
				strict: true,
			}),
		})) as PluginOption[];

		const appRoot =
			(
				globalThis as unknown as { process?: { cwd?: () => string } }
			).process?.cwd?.() ?? ".";

		return {
			resolve: {
				alias: {
					"#lib": `${appRoot}/src/lib`,
				},
			},
			plugins: [tw, ...sk, ...extraPlugins],
			...overrides,
		};
	});
}

export default defineGwaApp();
