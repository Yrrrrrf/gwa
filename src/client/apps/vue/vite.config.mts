import vue from "@vitejs/plugin-vue";
import type { PluginOption } from "vite-plus";
import { defineGWA } from "../../config/app.config.ts";

export default defineGWA({
	plugins: [vue() as PluginOption],
});
