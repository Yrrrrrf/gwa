<script lang="ts">
  import { Search, Eye, Ban } from 'lucide-svelte';
  import type { BusinessSummary } from "@sdk/core";
  import { StatusBadge, GlassCard } from "../primitives/mod.ts";
  import * as m from "../../../src/i18n/paraglide/messages.js";

  interface Props {
    data?: BusinessSummary[];
    onselect?: (id: string) => void;
  }

  let { data = [], onselect }: Props = $props();

  let search = $state("");
  let filterZona = $state("");

  const zonas = $derived([...new Set(data.map((d) => d.zone))]);

  const filtered = $derived(
    data.filter((c) => {
      const matchSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.owner.toLowerCase().includes(search.toLowerCase());
      const matchZona = !filterZona || c.zone === filterZona;
      return matchSearch && matchZona;
    }),
  );
</script>

<div class="space-y-4">
  <!-- Filtros -->
  <div class="flex flex-col sm:flex-row gap-3">
    <div class="relative flex-1">
      <Search size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
      <input
        type="text"
        placeholder={m.table_search()}
        class="input input-bordered bg-base-200/50 text-base-content placeholder:text-base-content/40 focus:border-primary/50 input-sm w-full pl-9"
        bind:value={search}
      />
    </div>
    <select
      class="select select-bordered bg-base-200/50 text-base-content select-sm focus:border-primary/50"
      bind:value={filterZona}
    >
      <option value="" class="bg-base-100">{m.table_all_zones()}</option>
      {#each zonas as zona (zona)}
        <option value={zona} class="bg-base-100">{zona}</option>
      {/each}
    </select>
    <div
      class="badge bg-base-content/5 border border-base-content/10 text-base-content/60 self-center px-3 py-3 text-[10px] font-bold uppercase"
    >
      {filtered.length}
      {m.table_results()}
    </div>
  </div>

  <!-- Tabla -->
  <div
    class="overflow-x-auto rounded-xl border border-base-content/10 shadow-2xl bg-base-200/40 backdrop-blur-md"
  >
    <table class="table table-zebra table-sm w-full text-base-content/80">
      <thead class="bg-base-content/5 text-base-content/60">
        <tr>
          <th class="text-xs">#</th>
          <th class="text-xs">{m.table_business()}</th>
          <th class="text-xs hidden md:table-cell">{m.table_owner()}</th>
          <th class="text-xs hidden sm:table-cell">{m.table_zone()}</th>
          <th class="text-xs">{m.table_category()}</th>
          <th class="text-xs hidden lg:table-cell">{m.table_dishes()}</th>
          <th class="text-xs">{m.table_sales()}</th>
          <th class="text-xs">{m.table_status()}</th>
          <th class="text-xs">{m.table_action()}</th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as c (c.id)}
          <tr
            class="hover:bg-base-content/5 border-b border-base-content/5 last:border-0 transition-colors"
          >
            <td class="text-[10px] font-bold text-base-content/30">{c.id}</td>
            <td>
              <div class="font-bold text-sm text-base-content">{c.name}</div>
            </td>
            <td class="hidden md:table-cell text-sm text-base-content/60"
              >{c.owner}</td
            >
            <td class="hidden sm:table-cell">
              <span
                class="badge bg-base-content/5 border border-base-content/10 text-base-content/60 badge-sm text-[9px] font-bold uppercase"
                >{c.zone}</span
              >
            </td>
            <td class="text-xs text-base-content/60 italic">{c.category}</td>
            <td class="hidden lg:table-cell text-center font-bold text-base-content"
              >{c.dish_count}</td
            >
            <td class="font-extrabold text-primary text-center">{c.sales}</td
            >
            <td>
              <StatusBadge status={c.status} />
            </td>
            <td>
              <div class="flex gap-1">
                <button
                  onclick={() => onselect?.(c.id)}
                  class="btn btn-xs btn-ghost hover:bg-primary/10 text-primary"
                  aria-label="Ver"
                >
                  <Eye size={14} />
                </button>
                <button
                  class="btn btn-xs btn-ghost hover:bg-error/10 text-error"
                  aria-label="Suspender">
                  <Ban size={14} />
                </button>
              </div>
            </td>
          </tr>
        {/each}

        {#if filtered.length === 0}
          <tr>
            <td
              colspan="9"
              class="text-center py-12 text-base-content/50 font-bold uppercase tracking-widest text-xs"
            >
              {m.table_no_results()}
            </td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>
</div>
