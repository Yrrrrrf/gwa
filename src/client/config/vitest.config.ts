import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, type PluginOption } from "vite-plus";

const SDK_ROOT = "./sdk";

const svelteProject = (
  name: string,
  root: string = SDK_ROOT,
  extraPlugins: PluginOption[] = [],
) => ({
  root: `${root}/${name}`,
  plugins: [
    svelte({
      configFile: false,
      compilerOptions: {},
    }) as PluginOption,
    ...extraPlugins,
  ],
  test: {
    name,
    environment: "jsdom",
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
    }),
  ] as PluginOption[],
  test: {
    projects: [
      svelteProject("core", SDK_ROOT),
      svelteProject("api", SDK_ROOT),
      svelteProject("state", SDK_ROOT),
      svelteProject("ui", SDK_ROOT),
    ],
  },
});
