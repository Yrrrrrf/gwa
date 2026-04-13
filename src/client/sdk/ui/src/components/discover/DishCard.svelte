<script lang="ts">
  import { Heart, Utensils } from "lucide-svelte";
  import { type Dish } from "@sdk/core";
  import {
    GlassCard,
    ImageWithFallback,
    CategoryBadge,
    RatingDisplay,
    PriceTag,
  } from "../primitives/mod.ts";
  import { tilt } from "../../actions/tilt.ts";
  import { CATEGORY_BG_ACCENTS } from "../../utils/category-colors.ts";
  import * as m from "../../../src/i18n/paraglide/messages.js";

  interface Props {
    dish: Dish;
    onselect?: () => void;
    accent?: string;
    glowColor?: string;
  }

  let { dish, onselect, accent: propAccent }: Props = $props();

  let liked = $state(false);
  let localLikes = $derived(dish.likes + (liked ? 1 : 0));

  function toggleLike() {
    liked = !liked;
  }

  const accent = $derived(propAccent ?? 
    CATEGORY_BG_ACCENTS[dish.category] ?? "from-primary/20 to-primary/10",
  );

  const glowColor = $derived(
    dish.category === 'mexican' ? '#10b981' : 
    dish.category === 'seafood' ? '#3b82f6' : 
    dish.category === 'mystic' ? '#a855f7' : 'oklch(var(--p))'
  );
</script>

<GlassCard
  onclick={onselect}
  {accent}
  {glowColor}
  enable3D={true}
  enableShimmer={true}
  class="cursor-pointer will-change-transform group h-full"
>
  <!-- ── IMAGEN con efecto pop-out ──────────────────────────── -->
  <figure
    class="relative overflow-hidden rounded-t-[2.5rem] h-48 sm:h-56 bg-gradient-to-br {accent}"
  >
    <ImageWithFallback
      src={dish.image_url}
      alt={dish.name}
      seed={dish.id}
      class="w-full h-full object-cover
             transform-gpu
             group-hover:scale-[1.12]
             group-hover:-translate-y-2
             group-hover:drop-shadow-2xl
             transition-all duration-700 ease-out"
    />

    <!-- Dark gradient overlay for text readability -->
    <div
      class="absolute inset-0 bg-gradient-to-t from-base-300/50 via-base-300/10 to-transparent
                opacity-0 group-hover:opacity-100 transition-opacity duration-500"
    ></div>

    <!-- Category badge -->
    <div class="absolute top-3 left-3 z-10">
      <CategoryBadge category={dish.category} />
    </div>

    <!-- Rating badge -->
    <div class="absolute top-3 right-3 z-10">
      <RatingDisplay value={dish.rating} />
    </div>

    <!-- Hover: restaurante floats in from bottom -->
    <div
      class="absolute bottom-0 inset-x-0 p-3
                translate-y-full group-hover:translate-y-0
                transition-transform duration-400 ease-out z-10"
    >
      <p
        class="text-primary-content text-xs font-medium drop-shadow flex items-center gap-1.5"
      >
        <Utensils size={12} />
        {dish.restaurant}
      </p>
    </div>

    <!-- Smooth Bottom Fade (Transition) -->
    <div
      class="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-base-100 via-base-100/40 to-transparent pointer-events-none z-[1]"
    ></div>
  </figure>

  <!-- ── BODY ────────────────────────────────────────────────── -->
  <div class="flex flex-col flex-1 p-4 gap-2">
    <h3
      class="font-bold text-base-content text-[15px] leading-snug line-clamp-2"
    >
      {dish.name}
    </h3>

    <div class="flex items-center justify-between mt-auto pt-2">
      <!-- Price -->
      <PriceTag amount={dish.price} />

      <!-- Like button -->
      <button
        onclick={(e) => {
          e.stopPropagation();
          toggleLike();
        }}
        class="flex items-center gap-1.5 px-3 py-2 rounded-2xl
               transition-all duration-300
               {liked
          ? 'bg-error text-error-content shadow-lg shadow-error/20'
          : 'bg-base-content/5 border border-base-content/10 text-base-content/60 hover:bg-error/10 hover:text-error'}"
        aria-label={m.food_dish()}
      >
        <Heart
          size={16}
          class="transition-transform duration-300 {liked ? 'scale-125' : ''}"
          fill={liked ? "currentColor" : "none"}
          strokeWidth={2}
        />
        <span class="text-xs font-semibold">{localLikes}</span>
      </button>
    </div>
  </div>
</GlassCard>
