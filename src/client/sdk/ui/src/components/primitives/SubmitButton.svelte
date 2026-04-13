<script lang="ts">
  import { type Snippet } from "svelte";

  interface Props {
    children: Snippet;
    loading?: boolean;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
    variant?: "primary" | "secondary" | "accent" | "error" | "ghost" | "outline";
    class?: string;
    onclick?: (e: MouseEvent) => void;
  }

  let {
    children,
    loading = false,
    disabled = false,
    type = "submit",
    variant = "primary",
    class: className = "",
    onclick,
  }: Props = $props();

  const variantClasses = {
    primary: "btn-primary shadow-lg shadow-primary/30 text-primary-content hover:shadow-primary/50",
    secondary: "btn-secondary shadow-lg shadow-secondary/30 text-secondary-content hover:shadow-secondary/50",
    accent: "btn-accent shadow-lg shadow-accent/30 text-accent-content hover:shadow-accent/50",
    error: "btn-error shadow-lg shadow-error/30 text-error-content hover:shadow-error/50",
    ghost: "btn-ghost text-base-content/70 hover:bg-base-content/10",
    outline: "btn-outline border-base-content/20 text-base-content hover:bg-base-content hover:border-base-content/40",
  };
</script>

<button
  {type}
  disabled={disabled || loading}
  class="btn font-bold rounded-2xl h-auto py-3 px-6 transition-all duration-300 w-full active:scale-[0.98] {variantClasses[variant]} {className}"
  {onclick}
>
  {#if loading}
    <span class="loading loading-spinner w-5 h-5"></span>
  {:else}
    {@render children()}
  {/if}
</button>
