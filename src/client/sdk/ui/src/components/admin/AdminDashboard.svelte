<script lang="ts">
  import { ShieldAlert, CheckCircle, XCircle, Store } from 'lucide-svelte';
  import { GlassCard } from "../primitives/mod.ts";
  import * as m from "../../../src/i18n/paraglide/messages.js";

  interface MerchantBase {
    id: string;
    name: string;
    category: string;
    status: "active" | "pending" | "suspended";
    reports?: number;
  }

  interface Props {
    merchants?: MerchantBase[];
    onApprove?: (id: string) => void;
    onSuspend?: (id: string) => void;
  }

  let { 
    merchants = [],
    onApprove,
    onSuspend
  }: Props = $props();

  const platformStats = $derived({
    total: merchants.length,
    active: merchants.filter(m => m.status === 'active').length,
    pending: merchants.filter(m => m.status === 'pending').length,
  });
</script>

<div class="space-y-6">
  <!-- Global Platform Stats -->
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <GlassCard class="p-5 flex flex-col items-center text-center">
      <h3 class="text-[10px] font-bold uppercase tracking-widest text-base-content/50">Comercios Totales</h3>
      <p class="text-3xl font-black text-primary mt-1">{platformStats.total}</p>
    </GlassCard>
    
    <GlassCard class="p-5 flex flex-col items-center text-center">
      <h3 class="text-[10px] font-bold uppercase tracking-widest text-base-content/50">Activos Oficiales</h3>
      <p class="text-3xl font-black text-success mt-1">{platformStats.active}</p>
    </GlassCard>

    <GlassCard class="p-5 flex flex-col items-center text-center relative overflow-hidden">
      <div class="absolute inset-0 bg-warning/5 animate-pulse"></div>
      <h3 class="text-[10px] font-bold uppercase tracking-widest text-base-content/50 relative z-10">Esperando Aprobación</h3>
      <p class="text-3xl font-black text-warning mt-1 relative z-10">{platformStats.pending}</p>
    </GlassCard>
  </div>

  <!-- Control y Gestión - Glass Table -->
  <GlassCard class="overflow-hidden">
    <div class="p-5 border-b border-base-content/5 flex items-center justify-between">
      <h2 class="text-lg font-bold flex items-center gap-2">
        <Store size={20} class="text-primary"/>
        Gestión de Negocios
      </h2>
    </div>

    <div class="overflow-x-auto">
      <table class="table table-zebra table-sm">
        <thead class="text-xs uppercase text-base-content/50 tracking-wider">
          <tr>
            <th>Comercio</th>
            <th>Categoría</th>
            <th>Estado</th>
            <th>Reportes</th>
            <th class="text-right">Acción</th>
          </tr>
        </thead>
        <tbody>
          {#each merchants as merchant}
            <tr class="hover:bg-base-200/50 transition-colors">
              <td class="font-bold text-sm">
                {merchant.name}
                {#if merchant.status === 'pending'}
                  <span class="badge badge-error badge-xs ml-2 animate-bounce">NUEVO</span>
                {/if}
              </td>
              <td class="text-xs text-base-content/70">{merchant.category}</td>
              <td>
                <div class="badge badge-sm font-bold uppercase
                  {merchant.status === 'active' ? 'badge-success' : 
                   merchant.status === 'pending' ? 'badge-warning' : 'badge-error'}">
                  {merchant.status}
                </div>
              </td>
              <td>
                {#if merchant.reports && merchant.reports > 0}
                  <span class="text-error flex items-center gap-1 text-xs font-bold">
                    <ShieldAlert size={12} /> {merchant.reports}
                  </span>
                {:else}
                  <span class="text-base-content/30 text-xs">—</span>
                {/if}
              </td>
              <td class="text-right">
                {#if merchant.status === 'pending'}
                  <button 
                    onclick={() => onApprove?.(merchant.id)}
                    class="btn btn-xs btn-success btn-outline gap-1"
                  >
                    <CheckCircle size={12} /> Aprobar
                  </button>
                {:else if merchant.status === 'active'}
                  <button 
                    onclick={() => onSuspend?.(merchant.id)}
                    class="btn btn-xs btn-error btn-ghost hover:bg-error/20 gap-1"
                  >
                    <XCircle size={12} /> Suspender
                  </button>
                {/if}
              </td>
            </tr>
          {/each}
          
          {#if merchants.length === 0}
            <tr>
              <td colspan="5" class="text-center py-8 text-base-content/40 text-sm font-medium">
                No hay comercios registrados.
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </GlassCard>
</div>
