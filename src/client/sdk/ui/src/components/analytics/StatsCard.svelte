<script lang="ts">
  import type { StatSnapshot } from '@sdk/core';
  import { GlassCard } from '../primitives/mod.ts';
  import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-svelte';

  interface Props extends Omit<StatSnapshot, 'icon'> {
    icon?: any;
  }

  let {
    title,
    value,
    desc = "",
    icon: Icon = BarChart3,
    trend = "neutral",
    trendValue = "",
    variant = "primary",
  }: Props = $props();

  const variantGradient: Record<string, string> = {
    primary: "from-primary to-primary/80",
    secondary: "from-secondary to-secondary/80",
    accent: "from-accent to-accent/80",
    success: "from-success to-success/80",
    warning: "from-warning to-warning/80",
    error: "from-error to-error/80",
  };

  const variantText: Record<string, string> = {
    primary: "text-primary",
    secondary: "text-secondary",
    accent: "text-accent",
    success: "text-success",
    warning: "text-warning",
    error: "text-error",
  };

  const TrendIcon = $derived(
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus,
  );
  const trendColor = $derived(
    trend === "up"
      ? "text-success"
      : trend === "down"
        ? "text-error"
        : "text-base-content/40",
  );
  const gradient = $derived(
    variantGradient[variant] ?? variantGradient.primary,
  );
  const textColor = $derived(variantText[variant] ?? variantText.primary);
</script>

<GlassCard
  accent={gradient}
  class="p-5 hover:-translate-y-1 transition-all duration-400 ease-out group"
>
  <!-- Icon circle -->
  <div
    class="w-11 h-11 rounded-xl flex items-center justify-center mb-3
              bg-gradient-to-br {gradient} shadow-md text-primary-content
              group-hover:scale-110 group-hover:rotate-3
              transition-transform duration-300"
  >
    <Icon size={24} strokeWidth={2} />
  </div>

  <!-- Title -->
  <p class="text-[10px] font-bold uppercase tracking-widest text-base-content/50 mb-1">
    {title}
  </p>

  <!-- Value -->
  <p class="text-3xl font-extrabold {textColor} leading-none mb-2">{value}</p>

  <!-- Trend + desc -->
  <div class="flex items-center gap-1.5 flex-wrap">
    {#if trendValue}
      <span class="flex items-center gap-0.5 text-xs font-bold {trendColor}">
        <TrendIcon size={12} strokeWidth={3} />
        {trendValue}
      </span>
    {/if}
    {#if desc}
      <span class="text-xs text-base-content/50">{desc}</span>
    {/if}
  </div>

  <!-- Hover glow background -->
  <div
    class="absolute inset-0 bg-gradient-to-br {gradient} opacity-0
              group-hover:opacity-[0.04] transition-opacity duration-400 pointer-events-none"
  ></div>
</GlassCard>
