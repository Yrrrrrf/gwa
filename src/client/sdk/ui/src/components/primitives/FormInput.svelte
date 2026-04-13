<script lang="ts">
  interface Props {
    value?: string | number;
    label?: string;
    type?: "text" | "password" | "email" | "number" | "tel" | "textarea" | "url";
    placeholder?: string;
    class?: string;
    required?: boolean;
    disabled?: boolean;
  }

  let {
    value = $bindable(""),
    label = "",
    type = "text",
    placeholder = "",
    class: className = "",
    required = false,
    disabled = false,
  }: Props = $props();

  const id = `input-${Math.random().toString(36).substring(2, 9)}`;
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

  {#if type === "textarea"}
    <textarea
      {id}
      bind:value
      {placeholder}
      {required}
      {disabled}
      class="textarea textarea-bordered w-full rounded-2xl bg-base-200/50 backdrop-blur-sm border-base-content/10 focus:border-primary focus:bg-base-100 transition-all duration-300 resize-none min-h-[100px]"
    ></textarea>
  {:else}
    <input
      {id}
      {type}
      bind:value
      {placeholder}
      {required}
      {disabled}
      class="input input-bordered w-full rounded-2xl bg-base-200/50 backdrop-blur-sm border-base-content/10 focus:border-primary focus:bg-base-100 transition-all duration-300"
    />
  {/if}
</div>
