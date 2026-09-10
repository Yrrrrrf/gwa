import react from "@vitejs/plugin-react";
import { arkano } from "arkano/vite";
import { defineGWA, type PluginOption } from "../../config/app.config.ts";

export default defineGWA({
	plugins: [
		react() as PluginOption,
		...(arkano({ target: "react" }) as PluginOption[]),
	],
});
