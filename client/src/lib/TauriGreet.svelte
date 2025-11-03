<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { onMount } from "svelte";

  // your runes signals (no imports needed)
  let name     = $state("");
  let greetMsg = $state("");

  /** call the Rust `greet` command */
  async function greet(event: Event) {
    event.preventDefault();
    greetMsg = await invoke("greet", { name });
  }

  onMount(() => {
    console.log("TauriGreet mounted");
  });
</script>

<div class="flex justify-center">
  <a href="https://vitejs.dev" target="_blank" class="hover:opacity-80" aria-label="Vite">
    <img
      src="/vite.svg"
      alt="Vite Logo"
      class="h-24 p-6 transition-all duration-700 hover:drop-shadow-lg"
    />
  </a>
  <a href="https://tauri.app" target="_blank" class="hover:opacity-80" aria-label="Tauri">
    <img
      src="/tauri.svg"
      alt="Tauri Logo"
      class="h-24 p-6 transition-all duration-700 hover:drop-shadow-lg"
    />
  </a>
  <a href="https://kit.svelte.dev" target="_blank" class="hover:opacity-80" aria-label="SvelteKit">
    <img
      src="/svelte.svg"
      alt="SvelteKit Logo"
      class="h-24 p-6 transition-all duration-700 hover:drop-shadow-lg"
    />
  </a>
</div>

<p class="mb-6">
  Click on the Tauri, Vite, and SvelteKit logos to learn more.
</p>

<!-- form + result -->
<form class="flex justify-center mb-4" onsubmit={greet}>
  <input 
    bind:value={name}
    placeholder="Enter a name..."
    class="mr-2 rounded-lg border border-transparent px-5 py-2 bg-white shadow-md transition-colors duration-200 focus:outline-none dark:bg-black dark:bg-opacity-60 dark:text-white"
  />
  <button 
    type="submit"
    class="rounded-lg border border-transparent px-5 py-2 bg-white shadow-md cursor-pointer hover:border-blue-600 active:bg-gray-200 transition-colors duration-200 focus:outline-none dark:bg-black dark:bg-opacity-60 dark:text-white"
  >
    Greet
  </button>
</form>

<p class="mt-2">{greetMsg}</p>
