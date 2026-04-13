<script lang="ts">
  interface Option {
    value: string;
    label: string;
  }

  interface Props {
    value?: string;
    label?: string;
    options: Option[];
    placeholder?: string;
    class?: string;
    required?: boolean;
    disabled?: boolean;
  }

  let {
    value = $bindable(""),
    label = "",
    options = [],
    placeholder = "Select an option",
    class: className = "",
    required = false,
    disabled = false,
  }: Props = $props();

  const id = `select-${Math.random().toString(36).substring(2, 9)}`;
</script>

<div class="form-control w-full {className}">
  {#if label}
    <label class="label pb-1" for={id}>
      <span class="label-text font-semibold text-base-content/80 text-xs tracking-wide uppercase">{label}</span>
      {#if required}
        <span class="label-text-alt text-error font-bold">*</span>
      {/if}
    </label>
  {/if}

  <select
    {id}
    bind:value
    {required}
    {disabled}
    class="select select-bordered w-full rounded-2xl bg-base-200/50 backdrop-blur-sm border-base-content/10 focus:border-primary focus:bg-base-100 transition-all duration-300 {value === '' ? 'text-base-content/50' : 'text-base-content'}"
  >
    <option value="" disabled selected>{placeholder}</option>
    {#each options as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
</div>
