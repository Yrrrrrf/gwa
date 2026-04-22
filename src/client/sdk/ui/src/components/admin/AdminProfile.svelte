<script lang="ts">
   import { ICONS, GlassCard, GlassContainer } from "@sdk/ui";
   import { authStore } from "@sdk/state";
   import {
      Shield,
      AlertTriangle,
      Lock,
      Activity,
      Users,
      Database,
      Globe,
      Zap,
      ArrowRight,
      Terminal,
   } from "@lucide/svelte";

   const securityItems = [
      { label: "Actividad sospechosa", value: "hace 2h", status: "warning" },
      { label: "Intentos fallidos hoy", value: "7", status: "error" },
      { label: "Tokens activos", value: "3", status: "success" },
   ];

   const metrics = [
      {
         label: "Registros",
         value: "+24",
         data: [20, 45, 30, 60, 40, 70, 55],
         color: "bg-primary",
      },
      {
         label: "Reportes",
         value: "0",
         data: [10, 5, 8, 3, 0, 2, 0],
         color: "bg-success",
      },
      {
         label: "Latencia",
         value: "42ms",
         data: [40, 42, 45, 41, 42, 43, 42],
         color: "text-info",
      },
   ];
</script>

<div class="space-y-12 pb-24">
   <!-- Admin Hero Section -->
   <section
      class="glass p-10 md:p-14 rounded-[3.5rem] border border-error/20 flex flex-col md:flex-row items-center gap-12 relative overflow-hidden group shadow-2xl shadow-error/10"
   >
      <div
         class="absolute -right-20 -top-20 w-80 h-80 bg-error/10 blur-[120px] rounded-full group-hover:scale-150 transition-transform duration-1000"
      ></div>
      <div
         class="absolute inset-0 opacity-5 pointer-events-none"
         style="background-image: radial-gradient(circle at 1px 1px, white 1px, transparent 0); background-size: 20px 20px;"
      ></div>

      <div
         class="relative w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] bg-error/20 flex items-center justify-center border-4 border-error/30 shadow-2xl group-hover:rotate-12 transition-transform duration-500"
      >
         <ICONS.admin
            size={80}
            class="text-error drop-shadow-[0_0_20px_rgba(255,0,0,0.4)]"
            strokeWidth={2.5}
         />
      </div>

      <div class="text-center md:text-left relative z-10 space-y-4">
         <div class="flex items-center gap-3 justify-center md:justify-start">
            <span
               class="px-4 py-1.5 rounded-full bg-error text-error-content text-[10px] font-black uppercase tracking-[0.2em] border border-error/50"
            >
               ROOT ACCESS
            </span>
            <div class="flex items-center gap-2">
               <div class="w-2 h-2 rounded-full bg-error animate-pulse"></div>
               <span
                  class="text-[10px] font-bold text-error uppercase tracking-widest"
                  >High Availability Mode</span
               >
            </div>
         </div>
         <h2
            class="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-white leading-none"
         >
            ADMINISTRADOR_ROOT
         </h2>
         <p class="text-white/40 font-mono text-xs tracking-[0.3em] uppercase">
            XIBALBA_CORE_OS // SYSTEM_LEVEL_9 // SECTOR_GLOBAL
         </p>
      </div>
   </section>

   <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
      <!-- 3.9.1 — Security Status Panel -->
      <GlassCard
         class="p-8 !rounded-[3rem] border border-error/20 shadow-2xl space-y-8"
         enable3D={true}
      >
         <div class="flex items-center justify-between">
            <h3
               class="text-[10px] font-black uppercase tracking-widest text-error flex items-center gap-2"
            >
               <Shield size={14} /> Security Dashboard
            </h3>
            <div
               class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-error/10 text-error border border-error/20 font-bold text-[9px] uppercase"
            >
               Encrypted
            </div>
         </div>

         <div class="space-y-6">
            {#each securityItems as item}
               <div
                  class="flex items-center justify-between p-4 rounded-2xl bg-base-100/40 border border-white/5 shadow-inner group hover:bg-base-100/60 transition-all cursor-pointer"
               >
                  <div class="flex items-center gap-4">
                     <div
                        class="w-2 h-2 rounded-full {item.status === 'error'
                           ? 'bg-error animate-pulse'
                           : item.status === 'warning'
                             ? 'bg-warning'
                             : 'bg-success'}"
                     ></div>
                     <span
                        class="text-xs font-black uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity"
                        >{item.label}</span
                     >
                  </div>
                  <span
                     class="text-xs font-mono font-bold {item.status === 'error'
                        ? 'text-error'
                        : item.status === 'warning'
                          ? 'text-warning'
                          : 'text-success'}"
                  >
                     {item.value}
                  </span>
               </div>
            {/each}
         </div>
         <p
            class="text-[10px] font-bold opacity-30 italic leading-relaxed text-center"
         >
            Todos los protocolos de integridad están activos. El cifrado de
            extremo a extremo está habilitado para todas las transacciones de
            datos.
         </p>
      </GlassCard>

      <!-- 3.9.2 — Quick Platform Metrics -->
      <GlassContainer
         class="!rounded-[3rem] border border-white/5 shadow-2xl p-8"
         title="Platform Sparklines"
      >
         <div class="space-y-10 mt-6">
            {#each metrics as metric}
               <div class="space-y-3">
                  <div class="flex justify-between items-end">
                     <span
                        class="text-[10px] font-black uppercase tracking-widest opacity-40"
                        >{metric.label}</span
                     >
                     <span
                        class="text-xl font-black italic tracking-tighter text-primary"
                        >{metric.value}</span
                     >
                  </div>
                  <div class="flex items-end justify-between gap-1 h-12 px-1">
                     {#each metric.data as h}
                        <div
                           class="flex-1 {metric.color ||
                              'bg-primary'} opacity-20 hover:opacity-100 transition-all rounded-t-sm"
                           style="height: {h}%"
                        ></div>
                     {/each}
                  </div>
               </div>
            {/each}
         </div>
         <a
            href="/admin"
            class="btn btn-ghost btn-block btn-xs mt-6 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 gap-2"
         >
            Full System Diagnostics <ArrowRight size={12} />
         </a>
      </GlassContainer>
   </div>

   <section class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div class="group relative">
         <div
            class="absolute inset-0 bg-error/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"
         ></div>
         <GlassCard
            class="relative p-10 !rounded-[2.5rem] border border-error/10 hover:border-error/30 transition-all flex flex-col items-center text-center cursor-pointer shadow-xl"
            enable3D={true}
         >
            <div
               class="w-16 h-16 rounded-[1.5rem] bg-error/10 text-error flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform"
            >
               <Terminal size={32} />
            </div>
            <h3
               class="font-black italic uppercase tracking-tighter text-xl mb-2"
            >
               Event Logs
            </h3>
            <p
               class="text-[10px] font-bold opacity-40 uppercase tracking-widest"
            >
               1,245 accesos hoy
            </p>
         </GlassCard>
      </div>

      <div class="group relative">
         <div
            class="absolute inset-0 bg-error/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"
         ></div>
         <GlassCard
            class="relative p-10 !rounded-[2.5rem] border border-error/10 hover:border-error/30 transition-all flex flex-col items-center text-center cursor-pointer shadow-xl"
            enable3D={true}
         >
            <div
               class="w-16 h-16 rounded-[1.5rem] bg-error/10 text-error flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform"
            >
               <ICONS.store size={32} />
            </div>
            <h3
               class="font-black italic uppercase tracking-tighter text-xl mb-2"
            >
               Comercios
            </h3>
            <p
               class="text-[10px] font-bold opacity-40 uppercase tracking-widest"
            >
               12 altas pendientes
            </p>
         </GlassCard>
      </div>

      <div class="group relative">
         <div
            class="absolute inset-0 bg-error/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"
         ></div>
         <GlassCard
            class="relative p-10 !rounded-[2.5rem] border border-error/10 hover:border-error/30 transition-all flex flex-col items-center text-center cursor-pointer shadow-xl"
            enable3D={true}
         >
            <div
               class="w-16 h-16 rounded-[1.5rem] bg-error/10 text-error flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform"
            >
               <Shield size={32} />
            </div>
            <h3
               class="font-black italic uppercase tracking-tighter text-xl mb-2"
            >
               Seguridad AI
            </h3>
            <p
               class="text-[10px] font-bold opacity-40 uppercase tracking-widest"
            >
               Modo Mundial Activo
            </p>
         </GlassCard>
      </div>
   </section>
</div>
