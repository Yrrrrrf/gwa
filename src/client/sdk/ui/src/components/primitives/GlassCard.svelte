<script lang="ts">
  import { type Snippet } from "svelte";

  interface Props {
    children: Snippet;
    class?: string;
    style?: string;
    onclick?: () => void;
    glowColor?: string;
    enable3D?: boolean;
    accent?: string;
    use?: any[];
    enableShimmer?: boolean;
  }

  let {
    children,
    class: className = "",
    style = "",
    onclick,
    glowColor = "oklch(var(--p))",
    enable3D = false,
    accent = "",
    use = [],
    enableShimmer = false,
  }: Props = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div {onclick} style="{style}; --glow-color: {glowColor};" class={enable3D ? "hover-3d" : ""}>
  <!-- Card Content wrapper -->
  <div
    class="group relative flex flex-col h-full w-full
           glass backdrop-blur-2xl bg-base-100/[0.08] hover:bg-base-100/[0.12] transition-all duration-500
           border border-white/[0.1] dark:border-white/[0.05]
           shadow-[0_8px_32px_-12px_rgba(0,0,0,0.4)] hover:shadow-[0_20px_60px_-15px_var(--glow-color)]
           rounded-[2.5rem] overflow-hidden will-change-transform {className}"
  >
    {#if accent}
      <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r {accent} opacity-80 z-20"></div>
    {/if}

    <!-- MYTHIC AURA GLOW (Breathing behind the card) -->
    <div
      class="absolute inset-0 z-[-1] opacity-0 group-hover:opacity-20 blur-[60px] transition-all duration-1000
             bg-[radial-gradient(circle_at_center,var(--glow-color)_0%,transparent_70%)] animate-pulse"
    ></div>

    <!-- PREMIUM GLASS REFLEX -->
    <div
      class="absolute inset-0 pointer-events-none overflow-hidden rounded-[2.5rem] z-0"
    >
      <div
        class="absolute inset-0 bg-gradient-to-br from-white/[0.15] via-transparent to-transparent
               opacity-20 group-hover:opacity-40 transition-opacity duration-1000"
      ></div>

      {#if enableShimmer}
      <div
        class="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-1000
               bg-[linear-gradient(110deg,transparent_45%,rgba(255,255,255,0.6)_50%,transparent_55%)]
               bg-[length:200%_100%] animate-[shimmer_12s_linear_infinite]"
      ></div>
      {/if}
    </div>

    <!-- Bottom highlight -->
    <div
      class="absolute inset-x-12 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--glow-color)] to-transparent
             opacity-0 group-hover:opacity-100 transition-all duration-1000 blur-[1px] z-20"
    ></div>

    <div class="relative z-10 h-full flex flex-col">
      {@render children()}
    </div>
  </div>
</div>
