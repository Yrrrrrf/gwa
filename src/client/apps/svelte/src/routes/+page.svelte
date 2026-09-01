<script lang="ts">
import faviconUrl from "#lib/assets/img/svelte.svg";
import pkg from "../../deno.json" with { type: "json" };

let count = $state(0);
</script>

<svelte:head>
  <title>{pkg.name}</title>
  <link rel="icon" href={faviconUrl} />
</svelte:head>

<div class="min-h-screen bg-base-100 flex flex-col items-center justify-center p-8 text-center gap-6">
  <div class="flex items-center gap-3">
    <img src={faviconUrl} alt="Svelte logo" class="w-16 h-16" />
    <h1 class="text-3xl font-bold">{pkg.name}</h1>
  </div>
  <p class="text-sm opacity-70 max-w-md">{pkg.description}</p>
  <div class="card bg-base-200 shadow-md p-6 flex flex-col items-center gap-4">
    <span class="text-4xl font-mono font-bold">{count}</span>
    <div class="flex gap-2">
      <button
        type="button"
        class="btn btn-primary btn-sm"
        onclick={() => count++}
      >
        Increment
      </button>
      <button
        type="button"
        class="btn btn-ghost btn-sm"
        onclick={() => count = 0}
      >
        Reset
      </button>
    </div>
  </div>
</div>
