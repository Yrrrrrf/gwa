<script lang="ts">
  import { MapPin, Star } from "lucide-svelte";
  import { GlassCard, CategoryBadge } from "../primitives/mod.ts";
  import { tilt } from "../../actions/tilt.ts";
  import { CATEGORY_BG_ACCENTS } from "../../utils/category-colors.ts";

  interface Props {
    business: {
      id: string;
      name: string;
      category: string;
      rating?: number;
      distance?: string;
      image_url?: string;
    };
    onselect?: () => void;
  }

  let { business, onselect }: Props = $props();

  const accent = $derived(
    CATEGORY_BG_ACCENTS[business.category] ?? "from-primary/20 to-primary/10",
  );
</script>

<GlassCard
  onclick={onselect}
  use={[tilt]}
  {accent}
  class="cursor-pointer will-change-transform group w-full"
  style="transform-style: preserve-3d;"
>
  <div class="flex items-center gap-4 p-4 pl-3">
    <!-- Image/Logo -->
    <div
      class="w-20 h-20 rounded-2xl flex-shrink-0 bg-gradient-to-br {accent} overflow-hidden
             shadow-inner border border-white/10 dark:border-white/5 relative"
    >
      {#if business.image_url}
        <img
          src={business.image_url}
          alt={business.name}
          class="w-full h-full object-cover transform-gpu group-hover:scale-110 transition-transform duration-500 ease-out"
          loading="lazy"
        />
      {:else}
        <div class="absolute inset-0 flex items-center justify-center text-primary/50 mix-blend-overlay">
          <span class="text-3xl font-black uppercase">{business.name.charAt(0)}</span>
        </div>
      {/if}
    </div>

    <!-- Info -->
    <div class="flex flex-col flex-1 min-w-0 py-1">
      <div class="flex items-start justify-between gap-2">
        <h3 class="font-bold text-base-content text-[16px] leading-tight truncate">
          {business.name}
        </h3>
        {#if business.rating}
          <div class="flex items-center gap-1 flex-shrink-0 bg-base-200/50 backdrop-blur-md px-1.5 py-0.5 rounded-lg border border-base-content/5">
            <Star size={10} class="text-warning fill-warning" />
            <span class="text-xs font-bold text-base-content/80">{business.rating.toFixed(1)}</span>
          </div>
        {/if}
      </div>

      <div class="mt-1 flex flex-wrap gap-2 items-center">
        <CategoryBadge category={business.category} />
      </div>

      {#if business.distance}
        <div class="mt-auto pt-2 flex items-center gap-1.5 text-base-content/50 group-hover:text-primary transition-colors">
          <MapPin size={12} />
          <span class="text-[11px] font-semibold tracking-wide">{business.distance}</span>
        </div>
      {/if}
    </div>
  </div>
</GlassCard>
