<script lang="ts">
  import { 
    X, 
    Pencil, 
    User, 
    MapPin, 
    House, 
    Phone, 
    Mail, 
    Clock, 
    MessageSquare, 
    Save,
    ChefHat
  } from 'lucide-svelte';
  import type { BusinessProfile } from "@sdk/core";
  import { GlassCard } from "../primitives/mod.ts";
  import * as m from "../../../src/i18n/paraglide/messages.js";

  interface Props {
    profile: BusinessProfile;
    onsave?: (updated: BusinessProfile) => void;
  }

  let { profile, onsave }: Props = $props();
  let editing = $state(false);
  let localProfile = $state<BusinessProfile>(undefined!);

  $effect.pre(() => {
    if (!editing) {
      localProfile = { ...profile };
    }
  });

  function handleSave() {
    editing = false;
    onsave?.(localProfile);
  }
</script>

<GlassCard class="p-6">
  <div
    class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4"
  >
    <div class="flex items-center gap-3">
      <div class="avatar placeholder">
        <div class="bg-primary text-primary-content w-14 rounded-full flex items-center justify-center">
          <ChefHat size={28} />
        </div>
      </div>
      <div>
        <h2 class="card-title text-xl text-base-content">{localProfile.name}</h2>
        <p class="text-sm text-base-content/60">{localProfile.category}</p>
      </div>
    </div>
    <button
      onclick={() => {
        editing = !editing;
      }}
      class="group flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 {editing
        ? 'bg-error/10 text-error border border-error/20'
        : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'}"
    >
      {#if editing}
        <X size={14} /> {m.editor_cancel()}
      {:else}
        <Pencil size={14} /> {m.editor_edit()}
      {/if}
    </button>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {#each [
      { label: m.biz_owner(), field: "owner_name" as const, icon: User }, 
      { label: m.biz_zone(), field: "zone" as const, icon: MapPin }, 
      { label: m.biz_address(), field: "address" as const, icon: House }, 
      { label: m.biz_phone(), field: "phone" as const, icon: Phone }, 
      { label: m.biz_email(), field: "email" as const, icon: Mail }, 
      { label: m.biz_hours(), field: "hours" as const, icon: Clock }
    ] as item}
      {@const Icon = item.icon}
      <div class="form-control">
        <label class="label py-1" for="field-{item.field}">
          <span
            class="label-text text-[10px] font-bold uppercase tracking-wider text-base-content/50 flex items-center gap-1.5"
          >
            <Icon size={12} class="text-base-content/40" />
            {item.label}
          </span>
        </label>
        {#if editing}
          <input
            id="field-{item.field}"
            class="input input-bordered bg-base-200/50 border-base-content/10 text-base-content input-sm focus:border-primary/50"
            bind:value={localProfile[item.field]}
          />
        {:else}
          <p
            class="text-sm py-2 px-3 bg-base-content/5 rounded-xl border border-base-content/5 text-base-content/80"
          >
            {localProfile[item.field]}
          </p>
        {/if}
      </div>
    {/each}
  </div>

  <div class="form-control mt-2">
    <label class="label py-1" for="biz-desc">
      <span
        class="label-text text-[10px] font-bold uppercase tracking-wider text-base-content/50 flex items-center gap-1.5"
        >
        <MessageSquare size={12} class="text-base-content/40" />
        {m.biz_description()}
      </span>
    </label>
    {#if editing}
      <textarea
        id="biz-desc"
        class="textarea textarea-bordered bg-base-200/50 border-base-content/10 text-base-content textarea-sm focus:border-primary/50"
        bind:value={localProfile.description}
        rows="3"
      ></textarea>
    {:else}
      <p
        class="text-sm py-2.5 px-3 bg-base-content/5 rounded-xl border border-base-content/5 text-base-content/80 leading-relaxed"
      >
        {localProfile.description}
      </p>
    {/if}
  </div>

  {#if editing}
    <div class="card-actions justify-end mt-4">
      <button onclick={handleSave} class="btn btn-primary gap-2">
        <Save size={18} /> {m.editor_save()}
      </button>
    </div>
  {/if}
</GlassCard>
