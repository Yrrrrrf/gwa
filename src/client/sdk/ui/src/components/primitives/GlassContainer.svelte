<script lang="ts">
  import { type Snippet } from "svelte";

  interface Props {
    children: Snippet;
    class?: string;
    style?: string;
    accent?: string;
    title?: string;
  }

  let {
    children,
    class: className = "",
    style = "",
    accent = "",
    title = "",
  }: Props = $props();
</script>

<div
  {style}
  class="relative flex flex-col
         glass backdrop-blur-3xl bg-base-100/30
         border border-white/10 dark:border-white/5
         shadow-xl shadow-base-content/5
         rounded-3xl overflow-hidden
         {className}"
>
  <!-- Optional subtle accent line at the top -->
  {#if accent}
    <div
      class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r {accent} opacity-80 z-10"
    ></div>
  {/if}

  <div class="relative z-10 w-full h-full">
    {#if title}
      <div class="px-8 pt-8 pb-2">
        <h3 class="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">{title}</h3>
      </div>
    {/if}
    {@render children()}
  </div>
</div>
