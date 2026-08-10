<script lang="ts">
import { getLayoutStore, WorkspaceLayout } from "rune-lab/layout";
import {
  type Command,
  getCommandStore,
  getRegistryStore,
  getToastStore,
  useShortcuts,
} from "rune-lab/palettes";
import { onMount, type Snippet } from "svelte";

let { children }: { children: Snippet } = $props();

const layout = getLayoutStore();
const commands = getCommandStore();
const registry = getRegistryStore();
const toasts = getToastStore();

const zoneToggles = [
  { zone: "strip", keys: "alt+1", label: "Toggle Workspace Strip" },
  { zone: "nav", keys: "alt+2", label: "Toggle Navigation Panel" },
  { zone: "detail", keys: "alt+3", label: "Toggle Detail Panel" },
  { zone: "statusbar", keys: "alt+4", label: "Toggle Statusbar" },
] as const;

useShortcuts([
  ...zoneToggles.map(({ zone, keys, label }) => ({
    id: `lab.toggle.${zone}`,
    keys,
    label,
    category: "Layout",
    handler: (e: KeyboardEvent) => {
      e.preventDefault();
      layout.toggleZone(zone);
    },
  })),
  {
    id: "lab.palette.commands",
    keys: "ctrl+space",
    label: "Open Command Palette",
    category: "Palettes",
    handler: (e: KeyboardEvent) => {
      e.preventDefault();
      registry.open("commands");
    },
  },
]);

onMount(() => {
  const demoCommands: Command[] = [
    ...zoneToggles.map(({ zone, label }) => ({
      id: `lab.cmd.toggle.${zone}`,
      label,
      category: "View",
      action: () => layout.toggleZone(zone),
    })),
    ...(["page", "docs", "workspace"] as const).map((preset) => ({
      id: `lab.cmd.preset.${preset}`,
      label: `Preset: ${preset}`,
      category: "View",
      action: () => layout.applyPreset(preset),
    })),
    {
      id: "lab.cmd.toasts",
      label: "Toasts…",
      category: "Demo",
      children: [
        {
          id: "lab.cmd.toasts.success",
          label: "Send success toast",
          action: () => toasts.success("It works! 🎉"),
        },
        {
          id: "lab.cmd.toasts.error",
          label: "Send error toast",
          action: () => toasts.error("Something exploded 💥"),
        },
      ],
    },
  ];

  for (const cmd of demoCommands) commands.register(cmd);
  return () => {
    for (const cmd of demoCommands) commands.unregister(cmd.id);
  };
});

const visibleZones = $derived(
  Object.entries(layout.zones)
    .filter(([id, z]) => id !== "overlay-anchor" && z.visible)
    .map(([id]) => id),
);
</script>

<WorkspaceLayout>
  {#snippet workspaceStrip()}
    <div
      class="h-full w-full rounded-xl bg-primary/15 text-primary flex flex-col items-center gap-3 py-3"
    >
      <span class="text-xl">🧪</span>
      <span
        class="[writing-mode:vertical-rl] text-[10px] font-bold uppercase tracking-widest opacity-70"
      >
        strip · alt+1
      </span>
    </div>
  {/snippet}

  {#snippet navigationPanel()}
    <div class="h-full w-full bg-secondary/10 text-secondary p-4 flex flex-col gap-2">
      <h2 class="font-bold uppercase text-xs tracking-widest">Navigation</h2>
      <p class="text-xs opacity-70">alt+2 toggles this panel</p>
      <p class="text-xs opacity-70">(native: ctrl+b)</p>
    </div>
  {/snippet}

  {#snippet content()}
    <div class="h-full w-full overflow-y-auto bg-base-100">
      {@render children()}
    </div>
  {/snippet}

  {#snippet detailPanel()}
    <div class="h-full w-full bg-accent/10 text-accent p-4 flex flex-col gap-2">
      <h2 class="font-bold uppercase text-xs tracking-widest">Detail</h2>
      <p class="text-xs opacity-70">alt+3 toggles this panel</p>
      <p class="text-xs opacity-70">(native: ctrl+j)</p>
    </div>
  {/snippet}

  {#snippet statusbar()}
    <div
      class="h-full w-full bg-info/20 text-info-content flex items-center gap-4 px-3 text-[11px] font-mono"
    >
      <span>preset: {layout.preset}</span>
      <span>zones: {visibleZones.join(" · ")}</span>
      <span class="ml-auto opacity-60">alt+4 toggles me</span>
    </div>
  {/snippet}
</WorkspaceLayout>
