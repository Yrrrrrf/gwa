import { paraglideVitePlugin } from "@inlang/paraglide-js";
import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
    paraglideVitePlugin({
      project: "./src/i18n/project.inlang",
      outdir: "./src/lib/paraglide",
      // first it checks localStorage, then the preferred language of the browser, and finally falls back to the base locale
      strategy: ["localStorage", "preferredLanguage", "baseLocale"],
    }),
  ],
  optimizeDeps: {
    exclude: [
      "rune-lab",
    ],
  },
  ssr: {
    noExternal: [
      "rune-lab",
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
