import { defineConfig } from "vite-plus";

export default defineConfig({
	test: {
		globals: true,
		projects: ["./sdk/*/vite.config.ts", "./apps/*/vite.config.*"],
		exclude: [
			"**/node_modules/**",
			"**/.git/**",
			"**/.svelte-kit/**",
			"**/dist/**",
			"**/build/**",
		],
	},
});
