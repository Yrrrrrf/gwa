<script lang="ts">
  import * as m from "../../i18n/paraglide/messages.js";
  import { authStore } from "@sdk/state";

  interface Props {
    activeTab?: string;
    ontabchange?: (tab: string) => void;
    mode?: "consumer" | "owner";
  }

  let {
    activeTab = "discover",
    ontabchange,
    mode = "consumer",
  }: Props = $props();

  const auth = authStore;

  const consumerItems = [
    { id: "discover", label: m.nav_discover() },
    { id: "saved", label: m.nav_saved() },
    { id: "profile", label: m.nav_profile() },
  ];

  const ownerItems = [
    {
      id: "dashboard",
      label: m.nav_dashboard(),
    },
    { id: "menu", label: m.nav_menu() },
    { id: "profile", label: m.nav_profile() },
    { id: "share", label: "Compartir" }, // Use share icon if available
  ];

  const items = $derived(mode === "consumer" ? consumerItems : ownerItems);

  const isActive = (id: string) => activeTab === id;
</script>

{#if auth.role}
  <nav
    class="md:hidden fixed bottom-6 inset-x-4 z-50
         glass backdrop-blur-2xl bg-base-100/10
         border border-white/10 dark:border-white/5
         shadow-[0_8px_32px_rgba(0,0,0,0.4)]
         rounded-2xl h-16 px-2 flex items-center justify-around"
  >
    {#each items as item}
      {@const Icon = item.icon}
      <button
        onclick={() => ontabchange?.(item.id)}
        class="flex flex-col items-center justify-center gap-0.5 flex-1 h-full rounded-xl transition-all duration-300 relative
             {isActive(item.id)
          ? 'text-primary scale-110'
          : 'text-base-content/40 hover:text-base-content/60'}"
      >
        <Icon
          size={20}
          strokeWidth={isActive(item.id) ? 2.5 : 2}
          fill={isActive(item.id) ? "currentColor" : "none"}
          class="transition-transform duration-300"
        />
        <span class="text-[9px] font-black uppercase tracking-tighter">
          {item.label}
        </span>

        {#if isActive(item.id)}
          <div
            class="absolute -bottom-1 w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_rgba(249,115,22,0.8)]"
          ></div>
        {/if}
      </button>
    {/each}
  </nav>
{/if}
