<script lang="ts">
import { getToastStore } from "rune-lab/palettes";
import { onMount } from "svelte";

const toasts = getToastStore();

let ticks = $state(0);
let path = $state("");

onMount(() => {
	path = location.pathname;
	const id = setInterval(() => ticks++, 1000);
	return () => clearInterval(id);
});
</script>

<div class="p-8 flex flex-col items-center justify-center gap-4 h-full text-center bg-gradient-to-br from-primary/10 to-secondary/10">
  <span class="text-5xl">🎪</span>
  <h1 class="text-2xl font-bold">Showcase</h1>
  <p class="text-sm opacity-60 font-mono">{path}</p>
  <p class="text-sm">
    Alive for <span class="font-mono font-bold">{ticks}s</span> — if this
    number is climbing inside Observer's content frame, the embedded page is
    actually running, not a static snapshot.
  </p>
  <button
    type="button"
    class="btn btn-sm btn-primary"
    onclick={() => toasts.success(`Ping from /showcase at ${ticks}s`)}
  >
    Send toast
  </button>
  <a href="/" class="link link-hover text-xs opacity-60">← back to test bench</a>
</div>
