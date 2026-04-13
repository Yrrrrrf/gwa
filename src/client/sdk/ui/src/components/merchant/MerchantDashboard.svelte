<script lang="ts">
  import { Package } from 'lucide-svelte';
  import type { Dish } from "@sdk/core";
  import {
    PriceTag,
    StatusBadge,
    EmptyState,
    GlassCard,
  } from "../primitives/mod.ts";
  import * as m from "../../../src/i18n/paraglide/messages.js";

  interface Props {
    dishes?: Dish[];
  }

  let { dishes = [] }: Props = $props();

  const totalSales = $derived(
    dishes.reduce((acc, p) => acc + p.sales_count, 0),
  );
  const availableCount = $derived(dishes.filter((p) => p.available).length);
</script>

<div class="space-y-4">
  <!-- Resumen -->
  <div
    class="stats stats-horizontal shadow-xl w-full bg-base-200/60 backdrop-blur-xl border border-base-content/10"
  >
    <div class="stat place-items-center">
      <div
        class="stat-title text-[10px] uppercase font-bold tracking-widest text-base-content/50"
      >
        {m.merchant_total_dishes()}
      </div>
      <div class="stat-value text-primary text-2xl">{dishes.length}</div>
    </div>
    <div class="stat place-items-center border-l border-base-content/5">
      <div
        class="stat-title text-[10px] uppercase font-bold tracking-widest text-base-content/50"
      >
        {m.merchant_available()}
      </div>
      <div class="stat-value text-success text-2xl">{availableCount}</div>
    </div>
    <div class="stat place-items-center border-l border-base-content/5">
      <div
        class="stat-title text-[10px] uppercase font-bold tracking-widest text-base-content/50"
      >
        {m.merchant_total_sales()}
      </div>
      <div class="stat-value text-info text-2xl">{totalSales}</div>
    </div>
  </div>

  <!-- Grid de productos -->
  {#if dishes.length === 0}
    <EmptyState
      title={m.merchant_no_dishes()}
      subtitle={m.merchant_no_dishes_sub()}
    />
  {:else}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each dishes as dish}
        <GlassCard
          class="bg-base-200/40 hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1"
        >
          <div class="p-4">
            <div class="flex items-start justify-between gap-2">
              <h3 class="font-bold text-base-content text-sm leading-tight">
                {dish.name}
              </h3>
              <StatusBadge
                status={dish.available ? "active_food" : "hidden_food"}
              />
            </div>
            <p class="text-xs text-base-content/60">{dish.category}</p>

            <div class="flex items-center justify-between mt-3">
              <PriceTag amount={dish.price} size="sm" />
              <span
                class="text-[10px] text-base-content/50 flex items-center gap-1 font-bold uppercase"
              >
                <Package size={10} class="text-base-content/40" />
                {dish.sales_count}
                {m.merchant_sales_label()}
              </span>
            </div>

            <div class="card-actions justify-end mt-2 flex gap-2">
              <button
                class="btn btn-xs btn-outline btn-warning"
                >{m.merchant_edit()}</button
              >
              <button
                class="btn btn-xs btn-outline btn-error"
                >{m.merchant_pause()}</button
              >
            </div>
          </div>
        </GlassCard>
      {/each}
    </div>
  {/if}
</div>
