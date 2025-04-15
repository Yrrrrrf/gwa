<script lang="ts">
    import { invoke } from "@tauri-apps/api/core";
    import { onMount } from "svelte";

  let name = $state("");
  let greetMsg = $state("");

  async function greet(event: Event) {
    event.preventDefault();
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    greetMsg = await invoke("greet", { name });
  }

  onMount(() => {
    // This is a good place to perform any setup or initialization
    // that needs to happen when the component mounts.
    console.log("Component mounted");
  });
</script>

<main class="m-0 pt-24 flex flex-col justify-center text-center">
  <h1 class="text-2xl font-bold mb-4">Welcome to General Web App</h1>

  <div class="flex justify-center">
    <a href="https://vitejs.dev" target="_blank" class="hover:opacity-80">
      <img src="/vite.svg" class="h-24 p-6 transition-all duration-700 hover:drop-shadow-lg" alt="Vite Logo" />
    </a>
    <a href="https://tauri.app" target="_blank" class="hover:opacity-80">
      <img src="/tauri.svg" class="h-24 p-6 transition-all duration-700 hover:drop-shadow-lg" alt="Tauri Logo" />
    </a>
    <a href="https://kit.svelte.dev" target="_blank" class="hover:opacity-80">
      <img src="/svelte.svg" class="h-24 p-6 transition-all duration-700 hover:drop-shadow-lg" alt="SvelteKit Logo" />
    </a>
  </div>
  
  <p class="mb-6">Click on the Tauri, Vite, and SvelteKit logos to learn more.</p>

  <form class="flex justify-center mb-4" onsubmit={greet}>
    <input 
      id="greet-input" 
      placeholder="Enter a name..." 
      bind:value={name}
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
</main>
