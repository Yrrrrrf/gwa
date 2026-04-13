<script lang="ts">
    import { getShortcutStore } from "rune-lab";

    import type { ShortcutEntry } from "rune-lab";

    const shortcutStore = getShortcutStore();

    function formatKeys(keys: string): string[] {
        return keys.split("+").map((k) => k.trim());
    }

    let conflicts = $derived.by(() => {
        const keyMap: Record<string, ShortcutEntry[]> = {};
        for (const entry of shortcutStore.entries) {
            const scopeKey = `${entry.keys}_${entry.scope ?? "global"}`;
            if (!keyMap[scopeKey]) keyMap[scopeKey] = [];
            keyMap[scopeKey].push(entry);
        }
        return Object.entries(keyMap).filter(([_, items]) => items.length > 1);
    });
</script>

<div class="flex flex-col gap-4 h-full relative">
    <div class="flex items-center justify-between">
        <h3 class="font-bold text-lg">Key Bindings</h3>
        <span class="badge badge-neutral"
            >{shortcutStore.entries.length} items</span
        >
    </div>

    {#if conflicts.length > 0}
        <!-- Conflicts Section -->
        <div
            class="collapse collapse-arrow bg-base-200 rounded-box border border-error shadow-xl"
        >
            <input type="checkbox" checked />
            <div
                class="collapse-title font-medium text-error flex items-center gap-2"
            >
                <span class="status status-error"></span>
                {conflicts.length} Key Conflict{#if conflicts.length !== 1}s{/if}
            </div>
            <div class="collapse-content">
                <ul class="flex flex-col gap-2">
                    {#each conflicts as [keys, items]}
                        <li
                            class="bg-base-100 p-2 rounded-lg flex flex-col gap-2 shadow-sm border border-base-content/5"
                        >
                            <div class="flex gap-1">
                                {#each formatKeys(keys) as k}
                                    <kbd class="kbd kbd-sm font-mono text-xs"
                                        >{k}</kbd
                                    >
                                {/each}
                            </div>
                            <div class="flex flex-wrap gap-1">
                                {#each items as item}
                                    <div
                                        class="badge badge-error badge-sm opacity-80 gap-1 flex items-center"
                                        title={item.id}
                                    >
                                        <span
                                            class="truncate max-w-[150px] font-mono text-[10px]"
                                            >{item.id}</span
                                        >
                                    </div>
                                {/each}
                            </div>
                        </li>
                    {/each}
                </ul>
            </div>
        </div>
    {/if}

    <!-- Fallback if empty -->
    {#if shortcutStore.entries.length === 0}
        <div
            class="flex flex-col items-center justify-center p-8 text-center text-base-content/50 border border-dashed rounded-box border-base-content/20 flex-1"
        >
            <p>No shortcuts registered</p>
        </div>
    {:else}
        <!-- Full List Directory -->
        <div
            class="card bg-base-100 shadow-xl border border-base-content/5 flex-1 min-h-0"
        >
            <div class="card-body p-0 gap-0 overflow-y-auto w-full">
                <table class="table table-xs w-full">
                    <thead class="bg-base-200 sticky top-0 z-10">
                        <tr>
                            <th>Action</th>
                            <th>Keys</th>
                            <th>Scope</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each shortcutStore.entries as entry}
                            <tr class="hover">
                                <td class="min-w-0 w-1/3">
                                    <span
                                        class="block font-medium truncate max-w-[120px]"
                                        title={entry.id}
                                    >
                                        {entry.id}
                                    </span>
                                </td>
                                <td class="w-1/3">
                                    <div class="flex flex-wrap gap-1">
                                        {#each formatKeys(entry.keys) as k}
                                            <kbd class="kbd kbd-sm opacity-80 font-mono text-[10px]"
                                                >{k}</kbd
                                            >
                                        {/each}
                                    </div>
                                </td>
                                <td class="w-1/3">
                                    <span
                                        class="badge badge-ghost badge-sm truncate max-w-[80px]"
                                    >
                                        {entry.scope ?? "global"}
                                    </span>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>
    {/if}
</div>
