<script lang="ts">
  import { X, MapPin, Clock, Phone, Globe, ArrowRight } from 'lucide-svelte';
  import { type Business } from "@sdk/core";
  import {
    RatingDisplay,
    ImageWithFallback,
  } from "../primitives/mod";
  import * as m from "../../../src/i18n/paraglide/messages.js";

  interface Props {
    business: Business | null;
    open: boolean;
    onclose: () => void;
  }

  let { business, open, onclose }: Props = $props();

  const accentColor = "from-primary to-primary/80";

  function handleBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) onclose();
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === "Escape") onclose();
  }
</script>

<svelte:window onkeydown={handleKey} />

{#if open && business}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-[1001] flex items-end sm:items-center justify-center p-0 sm:p-8 sm:pt-28
           bg-base-300/40 backdrop-blur-[20px] transition-all duration-700 ease-in-out"
    onclick={handleBackdrop}
  >
    <!-- Modal Panel (The Abyss Slide) -->
    <div
      class="relative w-full max-w-3xl h-fit max-h-[100vh] sm:max-h-[88vh] overflow-y-auto
             bg-base-100/90 backdrop-blur-[30px]
             border-t-2 sm:border-2 border-white/20
             rounded-t-[3rem] sm:rounded-[2.5rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)]
             flex flex-col animate-in fade-in slide-in-from-bottom-full duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]"
    >
      <!-- ── HERO IMAGE ─────────────────────────────────── -->
      <div
        class="relative h-[40vh] sm:h-80 flex-shrink-0 overflow-hidden rounded-t-[3rem] sm:rounded-t-[2.5rem]"
      >
        <ImageWithFallback
          src="/images/places/placeholder-business.jpg" 
          alt={business.name}
          seed={business.id}
          class="w-full h-full object-cover"
        />
        <!-- Gradient overlay -->
        <div
          class="absolute inset-0 bg-gradient-to-t from-base-100 via-base-100/20 to-transparent"
        ></div>

        <!-- Top accent -->
        <div
          class="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r {accentColor} opacity-80"
        ></div>

        <!-- Close button -->
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

        <!-- Category Badge Overlay -->
        <div class="absolute top-5 left-5 z-10">
          <span class="px-4 py-1.5 rounded-full bg-primary text-primary-content text-xs font-black uppercase tracking-widest shadow-lg">
            {business.category}
          </span>
        </div>

        <!-- Header Content -->
        <div class="absolute bottom-0 inset-x-0 p-6 sm:p-8">
          <h2 class="text-3xl sm:text-4xl font-black text-base-content tracking-tight leading-none mb-2 drop-shadow-sm">
            {business.name}
          </h2>
          <div class="flex items-center gap-4">
            <RatingDisplay value={business.rating} class="scale-110" />
            <span class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/20 text-success text-[10px] font-bold uppercase tracking-wider border border-success/30">
              ● {business.open ? m.badge_open() : m.badge_closed()}
            </span>
          </div>
        </div>
      </div>

      <!-- ── CONTENT ─────────────────────────────────────── -->
      <div class="flex flex-col gap-8 p-6 sm:p-8 pb-10 sm:pb-8">
        <!-- Location & Contact Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-4">
             <div class="flex items-start gap-3">
                <div class="p-2 rounded-lg bg-base-200 text-primary">
                  <MapPin size={18} />
                </div>
                <div>
                  <p class="text-[10px] font-black uppercase tracking-widest text-base-content/40 mb-0.5">Dirección</p>
                  <p class="text-sm font-bold text-base-content/80 leading-snug">{business.address}</p>
                </div>
             </div>
             
             <div class="flex items-start gap-3">
                <div class="p-2 rounded-lg bg-base-200 text-primary">
                  <Clock size={18} />
                </div>
                <div>
                  <p class="text-[10px] font-black uppercase tracking-widest text-base-content/40 mb-0.5">Horario</p>
                  <p class="text-sm font-bold text-base-content/80">Abierto hoy: 12:00 PM - 11:00 PM</p>
                </div>
             </div>
          </div>

          <div class="space-y-4">
             <div class="flex items-start gap-3">
                <div class="p-2 rounded-lg bg-base-200 text-primary">
                  <Phone size={18} />
                </div>
                <div>
                  <p class="text-[10px] font-black uppercase tracking-widest text-base-content/40 mb-0.5">Contacto</p>
                  <p class="text-sm font-bold text-base-content/80">+52 (55) 1234-5678</p>
                </div>
             </div>
             
             <div class="flex items-start gap-3">
                <div class="p-2 rounded-lg bg-base-200 text-primary">
                  <Globe size={18} />
                </div>
                <div>
                  <p class="text-[10px] font-black uppercase tracking-widest text-base-content/40 mb-0.5">Sitio Web</p>
                  <p class="text-sm font-bold text-primary hover:underline cursor-pointer">www.{business.name.toLowerCase().replace(/\s/g, '')}.mx</p>
                </div>
             </div>
          </div>
        </div>

        <!-- Description -->
        <div class="bg-base-200/40 backdrop-blur-sm border border-base-content/[0.05] rounded-[2rem] p-6">
           <p class="text-base-content/70 text-sm sm:text-base leading-relaxed">
             Este establecimiento se especializa en gastronomía de tipo <span class="text-primary font-bold">{business.category}</span>, 
             ofreciendo una experiencia auténtica y vibrante en el corazón de la zona. Pionero en revivir los sabores 
             tradicionales con un toque contemporáneo para el Mundial 2026.
           </p>
        </div>

        <!-- CTA Section -->
        <div class="flex flex-col sm:flex-row gap-4">
          <button
            class="flex-1 btn btn-primary font-black text-sm uppercase tracking-[0.15em] rounded-2xl h-14
                   shadow-xl shadow-primary/30 transition-all duration-300 hover:scale-[1.02] active:scale-95 group"
          >
            Explorar Menú Completo <ArrowRight size={18} class="ml-2 group-hover:translate-x-1 transition-transform" />
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
