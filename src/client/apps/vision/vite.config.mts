// vite plus

// sveltekit
import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
// customization
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type PluginOption } from "vite-plus";

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes("node_modules") ? undefined : true,
			},
			adapter: adapter({
				fallback: "index.html",
				strict: true,
			}),
		}),
	] as PluginOption[],
});
