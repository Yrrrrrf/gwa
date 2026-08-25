<script lang="ts">
import "./layout.css";
import { RuneProvider } from "rune-lab";
import pkg from "../../deno.json" with { type: "json" };
import { i18n } from "rune-lab/i18n";
import { layout } from "rune-lab/layout";
import { observer } from "rune-lab/observer";
import { palettes } from "rune-lab/palettes";
import type { Snippet } from "svelte";
import { faviconUrl } from "../lib/mod.ts";
import AppLayout from "./AppLayout.svelte";

let { children }: { children: Snippet } = $props();
</script>

<RuneProvider
  plugins={[
    layout,
    palettes,
    i18n,
    // observer
  ]}
  config={{
    app: {
      name: pkg.name,
      version: pkg.version,
      description: pkg.description,
      author: pkg.authors[0],
      icon: faviconUrl,
    },
  }}
>
  <AppLayout>
    {@render children()}
  </AppLayout>
</RuneProvider>
