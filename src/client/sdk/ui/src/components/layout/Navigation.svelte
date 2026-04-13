<script lang="ts">
  import { ICONS } from "../../icons/mod.ts";
  import { authStore } from "@sdk/state";

  const auth = authStore;

  let scrolled = $state(false);

  // Svelte 5 window event listener via rune-based logical block wouldn't be purely reactive
  // Need to use svelte:window
</script>

<svelte:window on:scroll={() => (scrolled = window.scrollY > 20)} />

<nav
  class="fixed top-0 inset-x-0 z-50 transition-all duration-500 ease-out flex items-center justify-between px-4 sm:px-8 py-3
         {scrolled
    ? 'bg-base-100/70 backdrop-blur-3xl border-b border-base-content/5 shadow-sm'
    : 'bg-transparent'}"
>
  <a
    href={auth.role === 'tourist' ? '/discover' : auth.role ? '/dashboard' : '/'}
    class="flex items-center gap-3 group"
  >
    <div
      class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 
             flex items-center justify-center text-primary-content shadow-lg shadow-primary/20
             group-hover:rotate-12 transition-transform duration-300"
    >
      <ICONS.brand size={24} />
    </div>
    <span class="font-extrabold text-xl tracking-tight text-base-content hidden sm:block">Xibalba</span>
  </a>

  <div class="flex items-center gap-3">
    {#if auth.role}
      <!-- Logged in state -->
      <div class="px-3 py-1.5 rounded-full bg-base-200/50 backdrop-blur-sm border border-base-content/5 flex items-center gap-2">
        <span class="w-2 h-2 rounded-full {auth.role === 'business' ? 'bg-warning' : 'bg-success'} animate-pulse"></span>
        <span class="text-xs font-bold uppercase text-base-content/70">{auth.role}</span>
      </div>
      <button 
        onclick={() => auth.logout()} 
        class="btn btn-ghost btn-circle text-base-content/60 hover:text-error hover:bg-error/10 transition-colors"
      >
        <ICONS.logout size={20} />
      </button>
    {:else}
      <!-- Logged out state -->
      <a href="/login" class="btn btn-ghost btn-sm rounded-full font-bold">
        Entrar
      </a>
      <a href="/register" class="btn btn-primary btn-sm rounded-full font-bold shadow-md shadow-primary/20">
        Registro
      </a>
    {/if}
  </div>
</nav>

<!-- Push main content down to avoid overlapping with fixed nav -->
<div class="h-16"></div>
