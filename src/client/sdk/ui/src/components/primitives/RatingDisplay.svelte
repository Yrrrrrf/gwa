<script lang="ts">
  import { Star } from 'lucide-svelte';

  interface Props {
    value: number;
    class?: string;
  }

  let { value, class: className = '' }: Props = $props();
</script>

<div class="flex items-center gap-1 px-2 py-1 rounded-full bg-base-200/50 backdrop-blur-sm border border-base-content/10 {className}">
  <Star size={10} class="text-warning fill-warning" />
  <span class="text-base-content text-xs font-bold leading-none">{value}</span>
</div>
