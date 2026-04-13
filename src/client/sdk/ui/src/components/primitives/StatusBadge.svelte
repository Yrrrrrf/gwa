<script lang="ts">
  interface Props {
    status: string;
    class?: string;
  }

  let { status, class: className = "" }: Props = $props();

  const statusMap: Record<string, string> = {
    active: "badge-success",
    inactive: "badge-ghost",
    pending: "badge-warning",
    error: "badge-error",
  };

  const labelMap: Record<string, string> = {
    active: "Active",
    inactive: "Inactive",
    pending: "Pending",
    error: "Error",
  };

  const label = $derived(labelMap[status] ?? status);
</script>

<div
  class="badge {statusMap[status] ??
    'badge-ghost'} badge-sm font-bold uppercase text-[9px] {className}"
>
  {label}
</div>
