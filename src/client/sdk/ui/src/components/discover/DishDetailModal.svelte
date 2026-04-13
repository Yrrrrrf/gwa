<script lang="ts">
  import { X, BarChart3, CookingPot, ShoppingCart } from 'lucide-svelte';
  import { type Dish } from "@sdk/core";
  import MapView from "./MapView.svelte";
  import {
    CategoryBadge,
    RatingDisplay,
    PriceTag,
    ImageWithFallback,
  } from "../primitives/mod.ts";
  import { CATEGORY_GRADIENT_ACCENTS } from "../../utils/category-colors.ts";
  import * as m from "../../../src/i18n/paraglide/messages.js";

  interface Props {
    dish: Dish | null;
    open: boolean;
    onclose: () => void;
  }

  let { dish, open, onclose }: Props = $props();

  const accent = $derived(
    dish
      ? (CATEGORY_GRADIENT_ACCENTS[dish.category] ??
          "from-primary to-primary/80")
      : "",
  );

  function handleBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) onclose();
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === "Escape") onclose();
  }
</script>

<svelte:window onkeydown={handleKey} />

{#if open && dish}
  <!-- Backdrop - Optimized padding for mobile flush look -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-8 sm:pt-28
           bg-base-300/60 backdrop-blur-md transition-all duration-300"
    onclick={handleBackdrop}
  >
    <!-- Modal Panel - Responsive rounded corners & heights -->
    <div
      class="relative w-full max-w-3xl h-fit max-h-[100vh] sm:max-h-[88vh] overflow-y-auto
             bg-base-100 backdrop-blur-2xl
             border-t sm:border border-base-content/10
             rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl
             flex flex-col animate-in fade-in slide-in-from-bottom-10 duration-500"
    >
      <!-- ── HERO IMAGE ─────────────────────────────────── -->
      <div
        class="relative h-[38vh] sm:h-80 flex-shrink-0 overflow-hidden rounded-t-[2.5rem] sm:rounded-t-3xl"
      >
        <ImageWithFallback
          src={dish.image_url}
          alt={dish.name}
          seed={dish.id}
          class="w-full h-full object-cover"
        />
        <!-- Gradient overlay for text readability -->
        <div
          class="absolute inset-0 bg-gradient-to-t from-base-100 via-base-100/20 to-transparent"
        ></div>

        <!-- Top accent line -->
        <div
          class="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r {accent} opacity-80"
        ></div>

        <!-- Close button - Better ergonomics on mobile -->
        <button
          onclick={onclose}
          class="absolute top-5 right-5 z-20
                 w-10 h-10 rounded-full
                 bg-base-100/40 backdrop-blur-xl border border-white/20
                 flex items-center justify-center
                 text-base-content shadow-lg
                 hover:bg-base-100/60 hover:scale-105
                 transition-all duration-300"
          aria-label={m.detail_close()}
        >
          <X size={20} strokeWidth={3} />
        </button>

        <!-- Category badge -->
        <div class="absolute top-5 left-5 z-10 flex gap-2">
          <CategoryBadge category={dish.category} />
        </div>

        <!-- Floating Info Overlay on Image -->
        <div class="absolute bottom-0 inset-x-0 p-6 sm:p-8">
          <h2
            class="text-3xl sm:text-4xl font-black text-base-content tracking-tight leading-none mb-2 drop-shadow-sm"
          >
            {dish.name}
          </h2>
          <div class="flex items-center gap-4">
            <PriceTag amount={dish.price} class="scale-110" />
            <RatingDisplay value={dish.rating} class="scale-110" />
          </div>
        </div>
      </div>

      <!-- ── CONTENT ─────────────────────────────────────── -->
      <div class="flex flex-col gap-8 p-6 sm:p-8 pb-10 sm:pb-8">
        <!-- Description - Enhanced typography -->
        {#if dish.description}
          <div class="relative">
            <div class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b {accent} opacity-40 rounded-full"></div>
            <p class="text-base-content/70 text-[15px] sm:text-base leading-relaxed italic pl-5 py-1">
              "{dish.description}"
            </p>
          </div>
        {/if}

        <!-- Information panels -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Nutrition Panel - Responsive Stats Grid -->
          {#if dish.nutrition}
            <div
              class="bg-base-200/40 backdrop-blur-sm border border-base-content/[0.05] rounded-[2rem] p-5 sm:p-6"
            >
              <div class="flex items-center justify-between mb-5">
                <p class="text-[11px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                  <BarChart3 size={14} /> {m.food_nutrition()}
                </p>
                <span class="text-[10px] font-bold text-base-content/40 bg-base-300/50 px-2 py-0.5 rounded-full">Valores medios</span>
              </div>
              
              <div class="grid grid-cols-2 gap-3 sm:gap-4">
                {#each [{ label: m.food_calories(), value: dish.nutrition.calories, unit: "kcal", color: "text-primary" }, { label: m.food_protein(), value: dish.nutrition.protein, unit: "g", color: "text-info" }, { label: m.food_fat(), value: dish.nutrition.fat, unit: "g", color: "text-warning" }, { label: m.food_carbs(), value: dish.nutrition.carbs, unit: "g", color: "text-success" }] as stat}
                  <div class="bg-base-100/50 rounded-2xl p-4 text-center border border-white/5 shadow-sm group hover:bg-white/10 transition-colors">
                    <p class="text-[10px] text-base-content/40 uppercase font-black tracking-wider mb-1.5">{stat.label}</p>
                    <div class="flex flex-col items-center">
                      <span class="font-black text-xl sm:text-2xl {stat.color} leading-none">{stat.value}</span>
                      <span class="text-[10px] font-bold text-base-content/30 mt-1">{stat.unit}</span>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Ingredients Panel -->
          {#if dish.ingredients && dish.ingredients.length > 0}
            <div
              class="bg-base-200/40 backdrop-blur-sm border border-base-content/[0.05] rounded-[2rem] p-5 sm:p-6 flex flex-col"
            >
              <p class="text-[11px] font-black uppercase tracking-[0.2em] text-primary mb-5 flex items-center gap-2">
                <CookingPot size={14} /> {m.food_ingredients()}
              </p>
              <div class="flex flex-wrap gap-2">
                {#each dish.ingredients as ing}
                  <span
                    class="px-4 py-1.5 rounded-xl text-[12px] font-bold
                           bg-base-100/80 border border-base-content/[0.08] text-base-content/80
                           hover:border-primary/30 hover:text-primary transition-all cursor-default"
                  >
                    {ing}
                  </span>
                {/each}
              </div>
              <div class="mt-auto pt-6 opacity-30">
                <p class="text-[10px] font-medium">* Los ingredientes pueden variar según disponibilidad local.</p>
              </div>
            </div>
          {/if}
        </div>

        <!-- CTA Section - Prominent buttons -->
        <div class="flex flex-col sm:flex-row gap-4 mt-4">
          <button
            class="flex-1 btn btn-primary font-black text-sm uppercase tracking-[0.15em] rounded-2xl h-14
                   shadow-xl shadow-primary/30 transition-all duration-300 hover:scale-[1.02] active:scale-95 group"
          >
            <ShoppingCart size={20} class="group-hover:bounce" /> {m.detail_order()}
          </button>
          <button
            onclick={onclose}
            class="px-8 btn btn-ghost font-black text-sm uppercase tracking-[0.15em] rounded-2xl h-14
                   bg-base-content/5 border border-base-content/[0.08] text-base-content/60
                   hover:bg-base-content/10 hover:text-base-content transition-all"
          >
            {m.detail_close()}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
</style>
