import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite-plus";

export default defineConfig({
	plugins: [
		sveltekit(),
		tailwindcss(),
		paraglideVitePlugin({
			project: "./src/i18n/project.inlang",
			outdir: "./src/lib/paraglide",
			// first it checks localStorage, then the preferred language of the browser, and finally falls back to the base locale
			strategy: ["localStorage", "preferredLanguage", "baseLocale"],
		}),
	],
	server: {
		fs: {
			allow: [
				// searchForWorkspaceRoot(process.cwd()),
				// path.resolve(__dirname, "../../node_modules"),
			],
		},
	},
});
