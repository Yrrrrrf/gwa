<script lang="ts">
interface Props {
	label?: string;
	status?: string;
}

let { label = "SDK", status = "wired" }: Props = $props();
</script>

<div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-mono bg-success/15 text-success border border-success/30">
  <span class="inline-block w-2 h-2 rounded-full bg-success animate-pulse"></span>
  <span class="opacity-70">{label}:</span>
  <span class="font-bold">{status}</span>
</div>
