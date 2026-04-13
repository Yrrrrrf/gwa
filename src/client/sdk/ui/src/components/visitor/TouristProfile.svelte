<script lang="ts">
  import { ICONS, m, GlassCard, GlassContainer } from "@sdk/ui";
  import { authStore } from "@sdk/state";
  import { Trophy, Globe, Moon, Star, Settings, Bell, MapPin, Eye, Lock, Zap } from "lucide-svelte";

  const achievements = [
    { name: "Primer Platillo", icon: "🌮", locked: false, color: "bg-primary/20" },
    { name: "5 Negocios", icon: "🏆", locked: false, color: "bg-warning/20" },
    { name: "Nocturno", icon: "🌙", locked: true, color: "bg-neutral/20" },
    { name: "Políglota", icon: "🌐", locked: true, color: "bg-info/20" },
    { name: "Gourmet", icon: "🍷", locked: true, color: "bg-secondary/20" }
  ];

  const tasteProfile = [
    { label: "Picante", value: 85, color: "bg-error" },
    { label: "Dulce", value: 40, color: "bg-secondary" },
    { label: "Salado", value: 65, color: "bg-primary" },
    { label: "Ácido", value: 30, color: "bg-info" },
    { label: "Umami", value: 90, color: "bg-accent" }
  ];

  const timeline = [
    { date: "Hace 2h", text: "Guardaste 'Tacos El Rey'", icon: Star, color: "text-warning" },
    { date: "Ayer", text: "Visitaste 'Zona Centro'", icon: MapPin, color: "text-primary" },
    { date: "Lunes", text: "Cambiaste idioma a English", icon: Globe, color: "text-info" },
    { date: "Lunes", text: "Nueva insignia desbloqueada", icon: Trophy, color: "text-warning" }
  ];
</script>

<div class="space-y-12 pb-24">
  <!-- Avatar Section -->
  <section class="glass p-8 md:p-12 rounded-[3rem] border border-white/10 shadow-2xl flex flex-col md:flex-row items-center gap-10 relative overflow-hidden group">
    <div class="absolute -right-20 -top-20 w-64 h-64 bg-secondary/10 blur-[100px] rounded-full group-hover:scale-150 transition-transform duration-1000"></div>
    <div class="relative w-32 h-32 md:w-40 md:h-40 rounded-full bg-secondary/10 flex items-center justify-center border-4 border-secondary/30 shadow-2xl group-hover:rotate-6 transition-transform">
      <ICONS.user size={64} class="text-secondary drop-shadow-[0_0_15px_rgba(var(--secondary),0.4)]" />
      <div class="absolute -bottom-2 -right-2 w-12 h-12 rounded-2xl bg-base-100 flex items-center justify-center border border-white/10 shadow-xl">
         <Trophy size={24} class="text-warning" />
      </div>
    </div>
    <div class="text-center md:text-left relative z-10">
      <div class="flex items-center gap-3 justify-center md:justify-start mb-3">
         <span class="px-4 py-1.5 rounded-full bg-secondary text-secondary-content text-[10px] font-black uppercase tracking-[0.2em] border border-secondary/50">
           Explorador Élite
         </span>
         <div class="flex items-center gap-1">
            <div class="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></div>
            <span class="text-[10px] font-bold text-success uppercase tracking-widest">Online</span>
         </div>
      </div>
      <h2 class="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-base-content to-base-content/40 leading-none">
        {authStore.user?.email?.split('@')[0] || "Turista Aventurero"}
      </h2>
      <div class="mt-6 flex flex-wrap gap-4 justify-center md:justify-start">
        <div class="flex flex-col">
           <span class="text-[10px] font-black uppercase tracking-widest opacity-40">Puntos</span>
           <span class="text-2xl font-black italic tracking-tighter text-secondary">2,450 XP</span>
        </div>
        <div class="w-px h-10 bg-base-content/10"></div>
        <div class="flex flex-col">
           <span class="text-[10px] font-black uppercase tracking-widest opacity-40">Nivel</span>
           <span class="text-2xl font-black italic tracking-tighter text-primary">12</span>
        </div>
      </div>
    </div>
  </section>

  <!-- 3.7.1 — Achievement Badges Row -->
  <section>
     <div class="flex items-center gap-3 mb-8 px-4">
        <div class="w-2 h-8 bg-secondary rounded-full"></div>
        <h3 class="text-2xl font-black italic uppercase tracking-tighter">Insignias Obtenidas</h3>
     </div>
     <div class="flex gap-6 overflow-x-auto pb-6 scrollbar-hide snap-x snap-mandatory px-4">
        {#each achievements as badge}
          <GlassCard class="flex-shrink-0 w-32 p-6 flex flex-col items-center gap-4 !rounded-[2.5rem] border border-white/5 shadow-xl transition-all duration-500 hover:-translate-y-2 {badge.locked ? 'opacity-30 grayscale' : 'hover:shadow-secondary/20'}" enable3D={!badge.locked}>
             <div class="w-16 h-16 rounded-[1.5rem] {badge.color} flex items-center justify-center text-4xl shadow-inner group-hover:scale-110 transition-transform">
                {badge.icon}
             </div>
             <span class="text-[10px] font-black uppercase tracking-widest text-center leading-tight">
                {badge.name}
             </span>
             {#if badge.locked}
                <div class="absolute inset-0 flex items-center justify-center bg-neutral/40 backdrop-blur-[2px] rounded-[2.5rem]">
                   <Lock size={20} class="text-white/50" />
                </div>
             {/if}
          </GlassCard>
        {/each}
     </div>
  </section>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
     <!-- 3.7.2 — Taste Profile Radar -->
     <GlassCard class="p-8 !rounded-[3rem] border border-white/5 shadow-2xl space-y-8" enable3D={true}>
        <div>
           <h3 class="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Algoritmo de Sabor</h3>
           <p class="text-2xl font-black italic uppercase tracking-tighter">Tu Perfil de Sabor</p>
        </div>

        <div class="space-y-6">
           {#each tasteProfile as item}
             <div class="space-y-2">
                <div class="flex justify-between items-end">
                   <span class="text-xs font-black uppercase tracking-widest">{item.label}</span>
                   <span class="text-[10px] font-bold opacity-40">{item.value}% Preferencia</span>
                </div>
                <div class="h-3 w-full bg-base-content/5 rounded-full overflow-hidden border border-white/5">
                   <div 
                     class="h-full {item.color} rounded-full transition-all duration-1000 ease-out"
                     style="width: {item.value}%"
                   ></div>
                </div>
             </div>
           {/each}
        </div>
        <p class="text-[10px] font-bold opacity-30 italic leading-relaxed">
          Basado en tus últimos 12 platillos guardados y visitados. Tu paladar tiende hacia lo ancestral y picante.
        </p>
     </GlassCard>

     <!-- 3.7.3 — Recent Activity Timeline -->
     <GlassContainer class="!rounded-[3rem] border border-white/5 shadow-2xl p-8" title="Actividad Reciente">
        <div class="space-y-8 mt-6">
           {#each timeline as item}
             {@const Icon = item.icon}
             <div class="flex items-start gap-4 group cursor-pointer relative">
                <div class="flex flex-col items-center gap-1 mt-1 z-10">
                   <div class="w-3 h-3 rounded-full bg-base-100 border-2 border-secondary group-hover:bg-secondary group-hover:scale-150 transition-all duration-300"></div>
                   <div class="w-px h-12 bg-base-content/10 group-last:hidden"></div>
                </div>
                <div class="flex-1 pb-4">
                   <div class="flex items-center gap-2 mb-1">
                      <Icon size={12} class={item.color} />
                      <span class="text-[10px] font-black uppercase tracking-widest opacity-30">{item.date}</span>
                   </div>
                   <p class="text-sm font-black uppercase tracking-tight text-base-content/70 group-hover:text-base-content transition-colors">
                      {item.text}
                   </p>
                </div>
             </div>
           {/each}
        </div>
        <button class="btn btn-ghost btn-block btn-xs mt-4 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100">
           Ver Historial de Viajes
        </button>
     </GlassContainer>
  </div>

  <!-- 3.7.4 — Settings Quick Panel -->
  <section>
     <div class="flex items-center gap-3 mb-8 px-4">
        <div class="w-2 h-8 bg-primary rounded-full"></div>
        <h3 class="text-2xl font-black italic uppercase tracking-tighter">Configuración Rápida</h3>
     </div>
     <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard class="p-6 !rounded-[2.5rem] border border-white/5 shadow-xl hover:shadow-primary/10 transition-all">
           <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                 <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Bell size={20} />
                 </div>
                 <div>
                    <p class="text-[10px] font-black uppercase tracking-widest">Notificaciones</p>
                    <p class="text-xs font-bold opacity-40">Push y Alertas Locales</p>
                 </div>
              </div>
              <input type="checkbox" class="toggle toggle-primary" checked />
           </div>
        </GlassCard>
        
        <GlassCard class="p-6 !rounded-[2.5rem] border border-white/5 shadow-xl hover:shadow-info/10 transition-all">
           <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                 <div class="w-10 h-10 rounded-xl bg-info/10 text-info flex items-center justify-center">
                    <Zap size={20} />
                 </div>
                 <div>
                    <p class="text-[10px] font-black uppercase tracking-widest">Ahorro de Datos</p>
                    <p class="text-xs font-bold opacity-40">Optimizar Imágenes</p>
                 </div>
              </div>
              <input type="checkbox" class="toggle toggle-info" />
           </div>
        </GlassCard>

        <GlassCard class="p-6 !rounded-[2.5rem] border border-white/5 shadow-xl hover:shadow-success/10 transition-all">
           <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                 <div class="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center">
                    <MapPin size={20} />
                 </div>
                 <div>
                    <p class="text-[10px] font-black uppercase tracking-widest">Ubicación</p>
                    <p class="text-xs font-bold opacity-40">Radar de Proximidad</p>
                 </div>
              </div>
              <input type="checkbox" class="toggle toggle-success" checked />
           </div>
        </GlassCard>

        <GlassCard class="p-6 !rounded-[2.5rem] border border-white/5 shadow-xl hover:shadow-warning/10 transition-all">
           <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                 <div class="w-10 h-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
                    <Lock size={20} />
                 </div>
                 <div>
                    <p class="text-[10px] font-black uppercase tracking-widest">Privacidad</p>
                    <p class="text-xs font-bold opacity-40">Perfil Público</p>
                 </div>
              </div>
              <input type="checkbox" class="toggle toggle-warning" checked />
           </div>
        </GlassCard>
     </div>
  </section>
</div>
