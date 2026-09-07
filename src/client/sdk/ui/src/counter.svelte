<script lang="ts">
interface Props {
	initial?: number;
	count?: number;
	onchange?: (count: number) => void;
}

let { initial = 0, count = $bindable(initial), onchange }: Props = $props();

function increment() {
	count += 1;
	onchange?.(count);
}

function reset() {
	count = 0;
	onchange?.(count);
}
</script>

<div class="card bg-base-200 shadow-md p-6 flex flex-col items-center gap-4">
  <span class="text-4xl font-mono font-bold">{count}</span>
  <div class="flex gap-2">
    <button
      type="button"
      class="btn btn-primary btn-sm"
      onclick={increment}
    >
      Increment
    </button>
    <button
      type="button"
      class="btn btn-ghost btn-sm"
      onclick={reset}
    >
      Reset
    </button>
  </div>
</div>
