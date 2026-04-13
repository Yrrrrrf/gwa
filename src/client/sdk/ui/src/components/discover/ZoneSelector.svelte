<script lang="ts">
  import { MapPin, Radio } from 'lucide-svelte';
  import type { Zone } from "@sdk/core";
  import * as m from "../../../src/i18n/paraglide/messages.js";

  interface Props {
    zones: Zone[];
    selectedZoneId: string;
    onchange?: (id: string) => void;
  }

  let { zones, selectedZoneId, onchange }: Props = $props();

  const selected = $derived(zones.find((z) => z.id === selectedZoneId));
</script>

<div
  class="card bg-base-200/60 backdrop-blur-xl shadow-xl border border-base-content/10 mb-4"
>
  <div class="card-body p-4">
    <div class="flex items-center gap-2 mb-3">
      <MapPin size={20} class="text-primary" />
      <h2 class="font-bold text-base text-base-content">
        {m.zone_your_location()}
      </h2>
    </div>

    <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <select
        class="select select-bordered bg-base-200/50 border-base-content/10 text-base-content focus:border-primary/50 w-full sm:max-w-xs"
        value={selectedZoneId}
        onchange={(e) => onchange?.(e.currentTarget.value)}
      >
        {#each zones as zone}
          <option value={zone.id} class="bg-base-100 text-base-content"
            >{zone.name}</option
          >{/each}
      </select>

      {#if selected}
        <div
          class="badge bg-primary/10 text-primary border border-primary/20 gap-1 py-3 px-3"
        >
          <span class="text-xs font-bold uppercase tracking-tighter"
            >{selected.name}</span
          >
        </div>
      {/if}
    </div>

    {#if selected}
      <p
        class="text-[10px] text-base-content/50 mt-2 flex items-center gap-1 font-bold uppercase tracking-widest"
      >
        <Radio size={10} class="text-primary" />
        {m.zone_gps_simulated()} <strong>{selected.name}</strong>
      </p>
    {/if}
  </div>
</div>
