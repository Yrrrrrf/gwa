<script lang="ts">
  import * as m from "../../../src/i18n/paraglide/messages.js";

  interface Props {
    status: string;
    class?: string;
  }

  let { status, class: className = "" }: Props = $props();

  const statusMap: Record<string, string> = {
    active: "badge-success",
    inactive: "badge-ghost",
    pending: "badge-warning",
    active_food: "badge-success",
    hidden_food: "badge-ghost",
  };

  const labelMap: Record<string, () => string> = {
    active: () => m.badge_open(),
    inactive: () => m.badge_closed(),
    pending: () => m.biz_status(),
    active_food: () => m.merchant_available(),
    hidden_food: () => m.badge_closed(),
  };

  const label = $derived(labelMap[status]?.() ?? status);
</script>

<div
  class="badge {statusMap[status] ??
    'badge-ghost'} badge-sm font-bold uppercase text-[9px] {className}"
>
  {label}
</div>
