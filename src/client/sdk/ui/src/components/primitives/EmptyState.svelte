<script lang="ts">
  import { type Snippet, type Component } from "svelte";
  import { Utensils } from "@lucide/svelte";

  interface Props {
    icon?: any;
    title: string;
    subtitle?: string;
    action?: Snippet;
  }

  let { icon: Icon = Utensils, title, subtitle, action }: Props = $props();
</script>

<div
  class="flex flex-col items-center justify-center py-12 text-center text-base-content/50"
>
  <div class="mb-3 text-base-content/30">
    <Icon size={48} strokeWidth={1.5} />
  </div>
  <p class="font-bold text-base-content/80">{title}</p>
  {#if subtitle}
    <p class="text-sm">{subtitle}</p>
  {/if}
  {#if action}
    <div class="mt-4">
      {@render action()}
    </div>
  {/if}
</div>
