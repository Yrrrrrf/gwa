<script lang="ts">
  import { ICONS } from "../../icons/mod";
  import { GlassCard } from "../primitives/mod";

  let { merchant = { id: "1", name: "Sample Merchant", category: "Food", rating: 4.5, isOpen: true } } = $props();
</script>

<div class="snap-center flex-shrink-0 w-72">
  <GlassCard 
    class="group cursor-pointer p-4 h-full !rounded-[2rem] hover:-translate-y-2 transition-all duration-500 shadow-xl"
  >
    <div class="relative h-48 rounded-[1.5rem] overflow-hidden mb-4">
      <img 
        src="https://picsum.photos/seed/{merchant.id}/400/300" 
        alt={merchant.name}
        class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-base-900 to-transparent opacity-60"></div>
      
      {#if merchant.isOpen}
        <div class="absolute top-4 right-4 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
          <div class="w-2 h-2 bg-success rounded-full animate-pulse"></div>
          <span class="text-[9px] font-black uppercase tracking-widest text-white">Abierto</span>
        </div>
      {/if}
    </div>

    <div class="px-2">
      <div class="flex justify-between items-start mb-2">
        <h3 class="text-lg font-black tracking-tight leading-tight line-clamp-1">{merchant.name}</h3>
        <div class="flex items-center gap-1 bg-warning/10 text-warning px-2 py-0.5 rounded-lg">
          <ICONS.star size={12} class="fill-warning" />
          <span class="text-[10px] font-black">{merchant.rating}</span>
        </div>
      </div>
      
      <div class="flex items-center gap-2 opacity-40">
        <span class="text-[10px] font-black uppercase tracking-widest">{merchant.category}</span>
      </div>
    </div>
  </GlassCard>
</div>
