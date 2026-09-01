import react from "@vitejs/plugin-react";
import type { PluginOption } from "vite-plus";
import { defineGWA } from "../../config/app.config.ts";

function htmlEntryPlugin(entry = "src/index.html"): PluginOption {
	return {
		name: "gwa-html-entry",
		configureServer(server) {
			server.middlewares.use((req, _res, next) => {
				if (req.url === "/" || req.url === "/index.html") {
					req.url = `/${entry}`;
				}
				next();
			});
		},
	};
}

export default defineGWA({
	plugins: [
		react() as unknown as PluginOption,
		htmlEntryPlugin("src/index.html"),
	],
	overrides: {
		build: {
			rollupOptions: {
				input: "src/index.html",
			},
		},
	},
});
