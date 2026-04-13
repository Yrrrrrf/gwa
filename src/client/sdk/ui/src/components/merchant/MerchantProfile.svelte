<script lang="ts">
  import { createBusinessStore } from "@sdk/state";
  import { BusinessProfileEditor, LocationPicker, ICONS, GlassCard, GlassContainer, QRCode, m } from "@sdk/ui";
  import { CheckCircle2, Circle, Eye, QrCode, ArrowRight, Sparkles, Download, Share2 } from "lucide-svelte";

  const businessStore = createBusinessStore();

  function handleSave(updated: any) {
    businessStore.updateProfile(updated);
  }

  function handleLocation(lat: number, lng: number, address?: string) {
    console.log("Location updated:", { lat, lng, address });
  }

  // 3.8.1 — Profile Completeness Indicator
  const completeness = 65;
  const missingItems = [
    { text: "Agrega foto de portada", done: false },
    { text: "Describe tu negocio", done: true },
    { text: "Verifica tu ubicación", done: true },
    { text: "Añade al menos 3 platillos", done: false }
  ];
</script>

<div class="space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
  
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
     <!-- Profile Completeness & Quick Stats -->
     <div class="lg:col-span-2">
        <GlassCard class="p-8 h-full !rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group" enable3D={true}>
           <div class="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 blur-[80px] rounded-full group-hover:bg-primary/10 transition-colors duration-1000"></div>
           
           <div class="flex flex-col md:flex-row items-center gap-8 relative z-10">
              <div class="relative flex items-center justify-center">
                 <div class="radial-progress text-primary" style="--value:{completeness}; --size:12rem; --thickness: 1rem;" role="progressbar">
                    <span class="text-4xl font-black italic uppercase tracking-tighter text-base-content">{completeness}%</span>
                 </div>
                 <div class="absolute -inset-4 border border-primary/20 rounded-full animate-pulse"></div>
              </div>

              <div class="flex-1 space-y-6">
                 <div>
                    <h3 class="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Tu Progreso</h3>
                    <p class="text-3xl font-black italic uppercase tracking-tighter leading-none mb-2">Perfecciona tu Perfil</p>
                    <p class="text-sm font-medium text-base-content/60 italic">Un perfil completo atrae un 40% más de turistas internacionales.</p>
                 </div>

                 <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {#each missingItems as item}
                       <div class="flex items-center gap-2 px-4 py-2 rounded-2xl bg-base-100/40 border border-white/10 shadow-inner">
                          {#if item.done}
                             <CheckCircle2 size={16} class="text-success" />
                             <span class="text-[10px] font-bold opacity-40 line-through">{item.text}</span>
                          {:else}
                             <Circle size={16} class="text-primary/40" />
                             <span class="text-[10px] font-black uppercase tracking-widest">{item.text}</span>
                          {/if}
                       </div>
                    {/each}
                 </div>
              </div>
           </div>
        </GlassCard>
     </div>

     <!-- 3.8.3 — QR Code Section -->
     <div class="lg:col-span-1">
        <GlassContainer class="p-8 h-full !rounded-[3rem] border border-white/5 shadow-2xl text-center flex flex-col items-center justify-center relative overflow-hidden group">
           <div class="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
           
           <h3 class="text-[10px] font-black uppercase tracking-widest opacity-40 mb-6 flex items-center gap-2">
              <QrCode size={14} /> Acceso Directo
           </h3>

           <div class="relative p-6 bg-white rounded-[2.5rem] shadow-2xl mb-6 group-hover:scale-105 transition-transform duration-500">
              <QRCode url={"https://xibalba.app/merchant/tacos-el-rey"} size={160} />
              <div class="absolute -inset-2 border-2 border-primary/20 rounded-[3rem] animate-pulse"></div>
           </div>

           <p class="text-[10px] font-black uppercase tracking-widest opacity-40 mb-6">Escanea para ver tu menú</p>
           
           <div class="flex gap-3 w-full">
              <button class="flex-1 btn btn-ghost btn-sm bg-base-200/50 rounded-xl text-[10px] font-black uppercase tracking-widest">
                 <Download size={14} /> Bajar
              </button>
              <button class="flex-1 btn btn-ghost btn-sm bg-base-200/50 rounded-xl text-[10px] font-black uppercase tracking-widest">
                 <Share2 size={14} /> Link
              </button>
           </div>
        </GlassContainer>
     </div>
  </div>

  <!-- 3.8.2 — Public Preview Toggle (Owners choice) -->
  <section>
    <div class="flex items-center justify-between mb-8 px-4">
       <div class="flex items-center gap-4">
          <div class="w-2 h-10 bg-secondary rounded-full"></div>
          <h2 class="text-4xl font-black italic uppercase tracking-tighter">Escaparate Digital</h2>
       </div>
       <a href="/merchant/tacos-el-rey" class="btn btn-secondary rounded-[1.5rem] px-8 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-secondary/20">
          <Eye size={16} /> Ver como Turista
       </a>
    </div>

    <div class="relative group cursor-pointer overflow-hidden rounded-[3.5rem] border border-white/10 shadow-2xl h-80">
      <div class="absolute inset-0 bg-gradient-to-t from-neutral/90 via-neutral/20 to-transparent z-10"></div>
      <div class="absolute inset-0 flex flex-col justify-end p-10 z-20">
        <div class="flex items-center gap-3 mb-2">
          <span class="px-4 py-1.5 rounded-full bg-secondary text-secondary-content text-[10px] font-black uppercase tracking-widest shadow-xl">Vista Previa</span>
          <span class="text-white/60 text-[10px] font-bold uppercase tracking-widest italic flex items-center gap-2">
            <Sparkles size={12} /> Personaliza el estilo visual desde aquí
          </span>
        </div>
        <h4 class="text-4xl font-black text-white italic uppercase tracking-tighter mb-4 max-w-xl">
          Así es como el mundo ve tu negocio en el mapa global
        </h4>
        <div class="flex gap-4">
           <button class="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-white font-black uppercase tracking-widest text-[10px] hover:bg-white/20 transition-all">
              Cambiar Diseño
           </button>
           <button class="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-white font-black uppercase tracking-widest text-[10px] hover:bg-white/20 transition-all">
              Editar Galería
           </button>
        </div>
      </div>
      <img 
        src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1200&auto=format&fit=crop" 
        alt="Preview" 
        class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[4s]"
      />
    </div>
  </section>

  <section>
    <div class="flex items-center gap-4 mb-8 px-4">
       <div class="w-2 h-10 bg-primary rounded-full"></div>
       <h2 class="text-4xl font-black italic uppercase tracking-tighter">
         {m.profile_general()}
       </h2>
    </div>
    <GlassCard class="p-8 !rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
       <div class="absolute -left-20 -bottom-20 w-64 h-64 bg-primary/5 blur-[80px] rounded-full"></div>
       <BusinessProfileEditor profile={businessStore.profile} onsave={handleSave} />
    </GlassCard>
  </section>

  <section>
    <div class="flex items-center gap-4 mb-8 px-4">
       <div class="w-2 h-10 bg-accent rounded-full"></div>
       <h2 class="text-4xl font-black italic uppercase tracking-tighter">
         {m.profile_location()}
       </h2>
    </div>
    <GlassCard class="p-4 !rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden">
       <div class="relative h-[400px] rounded-[2.5rem] overflow-hidden">
          <LocationPicker onlocationchange={handleLocation} />
       </div>
    </GlassCard>
  </section>
</div>
