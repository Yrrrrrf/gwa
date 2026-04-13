<script lang="ts">
    import type { Snippet } from "svelte";

    let {
        title,
        icon,
        children,
    }: {
        title: string;
        icon?: string;
        children: Snippet;
    } = $props();
</script>

<div class="card bg-base-100 shadow-xl border border-base-content/5">
    <div class="card-body gap-0">
        <h3 class="card-title text-sm opacity-60 mb-2">
            {#if icon}
                <span class="mr-2">{icon}</span>
            {/if}
            {title}
        </h3>
        {@render children()}
    </div>
</div>
