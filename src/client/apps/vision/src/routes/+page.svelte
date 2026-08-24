<script lang="ts">
import { LanguageSelector } from "rune-lab/i18n";
import { getLayoutStore, RichText, Text, ThemeSelector } from "rune-lab/layout";
import { getRegistryStore, getToastStore } from "rune-lab/palettes";
import PretextPlayground from "../lib/PretextPlayground.svelte";

const layout = getLayoutStore();
const registry = getRegistryStore();
const toasts = getToastStore();

let lineCount = $state(0);
let overflow = $state(false);

const longText =
	"Rune Lab is a plugin test bench. This paragraph is measured and wrapped by " +
	"pretext with pure arithmetic instead of DOM reflow — resize the window or " +
	"toggle the side panels and watch the line count update. Clamping is set to " +
	"three lines, so on narrow widths the overflow flag below flips to true.";

const richItems = [
	{ text: "Rendered by", font: "10px sans-serif" },
	{
		text: "pretext",
		font: "bold 12px sans-serif",
		break: "never" as const,
		extraWidth: 16,
	},
	{
		text: "with an atomic pill that never breaks across lines.",
		font: "24px sans-serif",
	},
];

const shortcuts = [
	["alt+1…alt+4", "toggle strip / nav / detail / statusbar"],
	["ctrl+space", "command palette (app shortcut)"],
	["ctrl+shift+k", "command palette (plugin default)"],
	["ctrl+/", "shortcut palette (plugin default)"],
	["ctrl+,", "settings modal (plugin default)"],
];
</script>

<ThemeSelector />
<LanguageSelector />

<div class="p-8 flex flex-col gap-6 max-w-3xl">
  <div>
    <h1 class="text-2xl font-bold">Rune Lab — test bench</h1>
    <p class="text-sm opacity-60">layout + palettes integration</p>
    <a href="/showcase" class="link link-primary text-xs">
      🎪 /showcase — simple page for testing Observer
    </a>
  </div>

  <div class="card bg-base-200 card-sm">
    <div class="card-body">
      <h2 class="card-title text-sm">Shortcuts</h2>
      <table class="table table-xs font-mono">
        <tbody>
          {#each shortcuts as [keys, what]}
            <tr
              ><td class="w-40"><kbd class="kbd kbd-sm">{keys}</kbd></td><td
                >{what}</td
              ></tr
            >
          {/each}
        </tbody>
      </table>
    </div>
  </div>

  <div class="card bg-base-200 card-sm">
    <div class="card-body">
      <h2 class="card-title text-sm">Triggers</h2>
      <div class="flex flex-wrap gap-2">
        <button class="btn btn-sm" onclick={() => registry.open("commands")}
        >Commands</button>
        <button class="btn btn-sm" onclick={() => registry.open("settings")}
        >Settings</button>
        <button
          class="btn btn-sm btn-outline"
          onclick={() => layout.applyPreset("page")}
        >
          Preset: page
        </button>
        <button
          class="btn btn-sm btn-outline"
          onclick={() => layout.applyPreset("workspace")}
        >
          Preset: workspace
        </button>
      </div>
    </div>
  </div>

  <div class="card bg-base-200 card-sm">
    <div class="card-body">
      <h2 class="card-title text-sm">
        pretext playground · lines: {lineCount} · overflow: {overflow}
      </h2>
      <PretextPlayground />
      <div class="divider my-1 text-xs opacity-50">
        clamped Text + rich pill
      </div>
      <Text content={longText} clamping={3} bind:lineCount bind:overflow />
      <RichText items={richItems} />
    </div>
  </div>
</div>
