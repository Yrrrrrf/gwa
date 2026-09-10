import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type PluginOption, type UserConfig } from "vite-plus";

const SDK_ROOT = new URL("../sdk", import.meta.url).pathname;
const SDK_ENTRY = new URL("../sdk/mod.ts", import.meta.url).pathname;

export interface GwaConfig {
	plugins?: PluginOption[];
	extraPlugins?: PluginOption[];
	overrides?: UserConfig;
}

function arkanoCompatPlugin(): PluginOption {
	return {
		name: "arkano-compat",
		enforce: "pre",
		async resolveId(source, importer) {
			if (source.includes(".svelte") && importer?.includes("node_modules")) {
				return this.resolve(source, importer, { skipSelf: true });
			}
			return null;
		},
		load(id) {
			if (id.includes("svelte&type=style&lang.css")) {
				const base = id.replace(/\?svelte&type=style&lang\.css.*$/, "");
				const rawInfo = this.getModuleInfo?.(`${base}?arkano-raw`);
				if (rawInfo?.meta?.svelte?.css) {
					return rawInfo.meta.svelte.css;
				}
				const plainInfo = this.getModuleInfo?.(base);
				if (plainInfo?.meta?.svelte?.css) {
					return plainInfo.meta.svelte.css;
				}
				return "";
			}
			return null;
		},
	};
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
				{ find: "@arkano/core", replacement: "arkano" },
				{ find: "@arkano/react", replacement: "arkano/react" },
				{ find: "@arkano/vue", replacement: "arkano/vue" },
			],
		},
		plugins: [
			arkanoCompatPlugin() as PluginOption,
			tailwindcss() as PluginOption,
			...plugins,
			...extraPlugins,
		],
		ssr: {
			noExternal: ["rune-lab", "arkano"],
		},
		...overrides,
	});
}

export default defineGWA();
export type { PluginOption };
