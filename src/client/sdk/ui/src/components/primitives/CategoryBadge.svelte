<script lang="ts">
  import { DISH_CATEGORIES } from "@sdk/core";
  import * as m from "../../../src/i18n/paraglide/messages.js";

  interface Props {
    category: string;
    class?: string;
  }

  let { category, class: className = "" }: Props = $props();

  const categoryColor: Record<string, string> = {
    mexican: "badge-primary",
    seafood: "badge-info",
    vegetarian: "badge-success",
    street_food: "badge-warning",
    drinks: "badge-secondary",
    desserts: "badge-accent",
    international: "badge-neutral",
    fast_food: "badge-error",
  };

  const categoryI18nKey: Record<string, () => string> = {
    mexican: () => m.cat_mexican(),
    seafood: () => m.cat_seafood(),
    street_food: () => m.cat_street_food(),
    drinks: () => m.cat_drinks(),
    desserts: () => m.cat_desserts(),
    international: () => m.cat_international(),
    vegetarian: () => m.cat_vegetarian(),
    fast_food: () => m.cat_fast_food(),
  };

  const badgeClass = $derived(categoryColor[category] ?? "badge-neutral");
  const label = $derived(categoryI18nKey[category]?.() ?? category);
</script>

<span
  class="badge {badgeClass} px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest {className}"
>
  {label}
</span>
