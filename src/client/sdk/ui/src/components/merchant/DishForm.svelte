<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Utensils, DollarSign, Tag, FileText, Image, Plus } from 'lucide-svelte';
  import type { DishFormData } from "@sdk/core";
  import { DISH_CATEGORIES } from "@sdk/core";
  import { FormInput, FormSelect, SubmitButton } from "../primitives/mod.ts";
  import * as m from "../../../src/i18n/paraglide/messages.js";

  interface Props {
    initial?: DishFormData | null;
    onsubmit?: (data: DishFormData) => void;
    oncancel?: () => void;
  }

  let { initial, onsubmit, oncancel }: Props = $props();

  let form = $state<DishFormData>({
    name: "",
    price: 0,
    category: "mexican",
    description: "",
    image_url: "",
    available: true,
  });

  $effect.pre(() => {
    if (initial) {
      form = { ...initial };
    }
  });

  let errors = $state<Partial<Record<keyof DishFormData, string>>>({});

  function validate(): boolean {
    errors = {};
    if (!form.name.trim()) errors.name = m.form_name_required();
    if (!form.price || Number(form.price) <= 0)
      errors.price = m.form_price_invalid();
    if (!form.description.trim()) errors.description = m.form_desc_required();
    return Object.keys(errors).length === 0;
  }

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (validate()) {
      onsubmit?.({ ...form, price: Number(form.price) });
    }
  }

  const categoryOptions = DISH_CATEGORIES.map(c => ({
    value: c.key,
    label: c.label
  }));
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-4">
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <!-- Nombre -->
    <div>
      <FormInput
        label={m.food_dish()}
        placeholder="ej. Tacos al Pastor x3"
        bind:value={form.name}
      />
      {#if errors.name}
        <div class="label pt-0"><span class="label-text-alt text-error">{errors.name}</span></div>
      {/if}
    </div>

    <!-- Precio -->
    <div>
      <FormInput
        type="number"
        label={`${m.food_price()} (USD)`}
        placeholder="ej. 8.50"
        bind:value={form.price}
      />
      {#if errors.price}
        <div class="label pt-0"><span class="label-text-alt text-error">{errors.price}</span></div>
      {/if}
    </div>
  </div>

  <!-- Categoría -->
  <FormSelect
    label={m.food_category()}
    options={categoryOptions}
    bind:value={form.category}
    placeholder="Selecciona Categoría"
  />

  <!-- Descripción -->
  <div>
    <FormInput
      type="textarea"
      label={m.biz_description()}
      placeholder="Describe tu platillo, ingredientes especiales..."
      bind:value={form.description}
    />
    {#if errors.description}
      <div class="label pt-0"><span class="label-text-alt text-error">{errors.description}</span></div>
    {/if}
  </div>

  <!-- URL Imagen -->
  <FormInput
    type="url"
    label={m.form_image_label()}
    placeholder="https://..."
    bind:value={form.image_url}
  />

  <!-- Disponible -->
  <div class="form-control">
    <label class="label cursor-pointer justify-start gap-3" for="prod-avail">
      <input
        id="prod-avail"
        type="checkbox"
        class="toggle toggle-primary"
        bind:checked={form.available}
      />
      <span class="label-text font-semibold">{m.form_available_now()}</span>
    </label>
  </div>

  <div class="flex justify-end gap-3 mt-2">
    {#if oncancel}
      <button type="button" onclick={oncancel} class="btn btn-ghost"
        >{m.form_cancel()}</button
      >
    {/if}
    <div class="w-32">
      <SubmitButton variant="primary">
        <div class="flex items-center gap-2">
          <Plus size={18} /> {m.form_submit()}
        </div>
      </SubmitButton>
    </div>
  </div>
</form>
