import { defineConfig } from "vite-plus";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";

export default defineConfig({
  plugins: [
    sveltekit(),
    tailwindcss(),
    paraglideVitePlugin({
      project: "./src/lib/i18n/project.inlang",
      outdir: "./src/lib/i18n/paraglide",
      // first it checks localStorage, then the preferred language of the browser, and finally falls back to the base locale
      strategy: ["localStorage", "preferredLanguage", "baseLocale"],
    }),
  ],
  optimizeDeps: {
    exclude: [
      "@sdk/ui",
    ],
  },
  ssr: {
    noExternal: [
      "lucide-svelte",
    ],
  },
  server: {
    fs: {
      allow: [
        // searchForWorkspaceRoot(process.cwd()),
        // path.resolve(__dirname, "../../node_modules"),
      ],
    },
  },
});
