<script lang="ts">
import "./layout.css";
import { RuneProvider } from "rune-lab";
import {default as pkg} from "../../deno.json"
import { i18n } from "rune-lab/i18n";
import { layout } from "rune-lab/layout";
import { observer } from "rune-lab/observer";
import { palettes } from "rune-lab/palettes";
import type { Snippet } from "svelte";
// import faviconUrl from "#lib/assets/img/rune.png";
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
      name: "GWA",
      version: pkg.version,
      description: pkg.description,
      author: pkg.authors[0],
      // icon: faviconUrl,
    },
  }}
>
  <AppLayout>
    {@render children()}
  </AppLayout>
</RuneProvider>
