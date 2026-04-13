<script lang="ts">
  import { ShieldAlert, CheckCircle, XCircle, Package } from 'lucide-svelte';
  import { GlassCard } from "../primitives/mod.ts";
  import { type Item } from "@sdk/core";

  interface ItemBase {
    id: string;
    title: string;
    status: string;
    description?: string | null;
  }

  interface Props {
    items?: ItemBase[];
    onApprove?: (id: string) => void;
    onDelete?: (id: string) => void;
  }

  let { 
    items = [],
    onApprove,
    onDelete
  }: Props = $props();

  const stats = $derived({
    total: items.length,
    active: items.filter(i => i.status === 'active').length,
    pending: items.filter(i => i.status === 'pending').length,
  });
</script>

<div class="space-y-6">
  <!-- Global Stats -->
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <GlassCard class="p-5 flex flex-col items-center text-center">
      <h3 class="text-[10px] font-bold uppercase tracking-widest text-base-content/50">Total Items</h3>
      <p class="text-3xl font-black text-primary mt-1">{stats.total}</p>
    </GlassCard>
    
    <GlassCard class="p-5 flex flex-col items-center text-center">
      <h3 class="text-[10px] font-bold uppercase tracking-widest text-base-content/50">Active Items</h3>
      <p class="text-3xl font-black text-success mt-1">{stats.active}</p>
    </GlassCard>

    <GlassCard class="p-5 flex flex-col items-center text-center relative overflow-hidden">
      <div class="absolute inset-0 bg-warning/5 animate-pulse"></div>
      <h3 class="text-[10px] font-bold uppercase tracking-widest text-base-content/50 relative z-10">Pending</h3>
      <p class="text-3xl font-black text-warning mt-1 relative z-10">{stats.pending}</p>
    </GlassCard>
  </div>

  <!-- Item Management Table -->
  <GlassCard class="overflow-hidden">
    <div class="p-5 border-b border-base-content/5 flex items-center justify-between">
      <h2 class="text-lg font-bold flex items-center gap-2">
        <Package size={20} class="text-primary"/>
        Item Management
      </h2>
    </div>

    <div class="overflow-x-auto">
      <table class="table table-zebra table-sm">
        <thead class="text-xs uppercase text-base-content/50 tracking-wider">
          <tr>
            <th>Item</th>
            <th>Status</th>
            <th>Description</th>
            <th class="text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {#each items as item}
            <tr class="hover:bg-base-200/50 transition-colors">
              <td class="font-bold text-sm">
                {item.title}
                {#if item.status === 'pending'}
                  <span class="badge badge-error badge-xs ml-2 animate-bounce">NEW</span>
                {/if}
              </td>
              <td>
                <div class="badge badge-sm font-bold uppercase
                  {item.status === 'active' ? 'badge-success' : 
                   item.status === 'pending' ? 'badge-warning' : 'badge-error'}">
                  {item.status}
                </div>
              </td>
              <td class="text-xs text-base-content/70 max-w-xs truncate">{item.description || '—'}</td>
              <td class="text-right">
                {#if item.status === 'pending'}
                  <button 
                    onclick={() => onApprove?.(item.id)}
                    class="btn btn-xs btn-success btn-outline gap-1"
                  >
                    <CheckCircle size={12} /> Approve
                  </button>
                {/if}
                <button 
                  onclick={() => onDelete?.(item.id)}
                  class="btn btn-xs btn-error btn-ghost hover:bg-error/20 gap-1"
                >
                  <XCircle size={12} /> Delete
                </button>
              </td>
            </tr>
          {/each}
          
          {#if items.length === 0}
            <tr>
              <td colspan="4" class="text-center py-8 text-base-content/40 text-sm font-medium">
                No items found.
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </GlassCard>
</div>
