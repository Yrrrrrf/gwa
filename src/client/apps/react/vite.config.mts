import react from "@vitejs/plugin-react";
import { defineGWA, type PluginOption } from "../../config/app.config.ts";

export default defineGWA({
	plugins: [react() as PluginOption],
});
