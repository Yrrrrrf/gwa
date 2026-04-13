<script lang="ts">
    import { onMount } from "svelte";
    import { m } from "$lib/i18n/messages.ts";

    // Persistence keys that rune-lab stores use
    const RL_KEYS = ["theme", "language", "currency", "cart"];
    const RL_LAYOUT_PREFIX = "rl:layout:";

    // Reactive state for each driver's contents
    let cookieEntries = $state<[string, string][]>([]);
    let localStorageEntries = $state<[string, string][]>([]);
    let sessionStorageEntries = $state<[string, string][]>([]);

    // Snapshot of persisted values before reload
    let preReloadSnapshot = $state<Record<string, string>>({});

    function readCookies(): [string, string][] {
        if (typeof document === "undefined") return [];
        return document.cookie
            .split(";")
            .map((c) => c.trim())
            .filter((c) => c.length > 0)
            .map((c) => {
                const [k, ...v] = c.split("=");
                return [k, decodeURIComponent(v.join("="))] as [string, string];
            });
    }

    function readLocalStorage(): [string, string][] {
        if (typeof localStorage === "undefined") return [];
        const entries: [string, string][] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (
                key &&
                (RL_KEYS.includes(key) || key.startsWith(RL_LAYOUT_PREFIX))
            ) {
                entries.push([key, localStorage.getItem(key) ?? ""]);
            }
        }
        return entries;
    }

    function readSessionStorage(): [string, string][] {
        if (typeof sessionStorage === "undefined") return [];
        const entries: [string, string][] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (
                key &&
                (RL_KEYS.includes(key) || key.startsWith(RL_LAYOUT_PREFIX))
            ) {
                entries.push([key, sessionStorage.getItem(key) ?? ""]);
            }
        }
        return entries;
    }

    function refresh() {
        cookieEntries = readCookies();
        localStorageEntries = readLocalStorage();
        sessionStorageEntries = readSessionStorage();
    }

    function takeSnapshot() {
        const snap: Record<string, string> = {};
        for (const [k, v] of cookieEntries) snap[`cookie:${k}`] = v;
        for (const [k, v] of localStorageEntries) snap[`ls:${k}`] = v;
        preReloadSnapshot = snap;
    }

    function hardReload() {
        takeSnapshot();
        // Store snapshot in sessionStorage so we can compare after reload
        sessionStorage.setItem(
            "__rl_lab_snapshot",
            JSON.stringify(preReloadSnapshot),
        );
        window.location.reload();
    }

    // On mount, check for pre-reload snapshot
    onMount(() => {
        refresh();

        const raw = sessionStorage.getItem("__rl_lab_snapshot");
        if (raw) {
            try {
                preReloadSnapshot = JSON.parse(raw);
            } catch {}
            sessionStorage.removeItem("__rl_lab_snapshot");
        }

        // Poll every second for changes
        const interval = setInterval(refresh, 1000);
        return () => clearInterval(interval);
    });
</script>

<div class="h-full overflow-y-auto p-4 space-y-4">
    <div class="flex items-center justify-between mb-3">
        <h2
            class="text-xs font-black uppercase tracking-widest text-primary/70"
        >
            {m.persistence_inspector_label()}
        </h2>
        <button class="btn btn-xs btn-ghost" onclick={refresh}
            >🔄 {m.refresh_btn()}</button
        >
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <!-- Cookies -->
        <div class="space-y-2">
            <h3 class="text-xs font-bold opacity-60">🍪 {m.cookies_label()}</h3>
            <div class="card bg-base-200">
                <div class="card-body p-2 max-h-48 overflow-y-auto">
                    {#if cookieEntries.length === 0}
                        <p class="text-xs opacity-30 italic">
                            {m.no_cookies_msg()}
                        </p>
                    {:else}
                        {#each cookieEntries as [key, value]}
                            <div class="text-xs font-mono break-all mb-1">
                                <span class="text-primary font-bold">{key}</span
                                >=<span class="opacity-60">{value}</span>
                            </div>
                        {/each}
                    {/if}
                </div>
            </div>
        </div>

        <!-- localStorage -->
        <div class="space-y-2">
            <h3 class="text-xs font-bold opacity-60">
                📦 {m.local_storage_label()}
            </h3>
            <div class="card bg-base-200">
                <div class="card-body p-2 max-h-48 overflow-y-auto">
                    {#if localStorageEntries.length === 0}
                        <p class="text-xs opacity-30 italic">
                            {m.no_rl_keys_msg()}
                        </p>
                    {:else}
                        {#each localStorageEntries as [key, value]}
                            <div class="text-xs font-mono break-all mb-1">
                                <span class="text-primary font-bold">{key}</span
                                >=<span class="opacity-60">{value}</span>
                            </div>
                        {/each}
                    {/if}
                </div>
            </div>
        </div>

        <!-- sessionStorage -->
        <div class="space-y-2">
            <h3 class="text-xs font-bold opacity-60">
                🔒 {m.session_storage_label()}
            </h3>
            <div class="card bg-base-200">
                <div class="card-body p-2 max-h-48 overflow-y-auto">
                    {#if sessionStorageEntries.length === 0}
                        <p class="text-xs opacity-30 italic">
                            {m.no_rl_keys_msg()}
                        </p>
                    {:else}
                        {#each sessionStorageEntries as [key, value]}
                            <div class="text-xs font-mono break-all mb-1">
                                <span class="text-primary font-bold">{key}</span
                                >=<span class="opacity-60">{value}</span>
                            </div>
                        {/each}
                    {/if}
                </div>
            </div>
        </div>
    </div>

    <!-- Reload Test Bar -->
    <div class="divider"></div>
    <div class="space-y-2">
        <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold opacity-60">
                🔄 {m.reload_test_label()}
            </h3>
            <button class="btn btn-xs btn-warning" onclick={hardReload}>
                {m.hard_reload_btn()}
            </button>
        </div>

        {#if Object.keys(preReloadSnapshot).length > 0}
            <div class="card bg-base-200">
                <div class="card-body p-2 space-y-1">
                    <p class="text-xs font-bold opacity-60">
                        {m.pre_reload_snapshot_label()}
                    </p>
                    {#each Object.entries(preReloadSnapshot) as [key, value]}
                        {@const currentValue = (() => {
                            if (key.startsWith("cookie:")) {
                                const ck = key.replace("cookie:", "");
                                return (
                                    cookieEntries.find(
                                        ([k]) => k === ck,
                                    )?.[1] ?? "MISSING"
                                );
                            }
                            if (key.startsWith("ls:")) {
                                const lk = key.replace("ls:", "");
                                return (
                                    localStorageEntries.find(
                                        ([k]) => k === lk,
                                    )?.[1] ?? "MISSING"
                                );
                            }
                            return "UNKNOWN";
                        })()}
                        <div class="text-xs font-mono flex items-center gap-2">
                            {#if currentValue === value}
                                <span class="text-success">✓</span>
                            {:else}
                                <span class="text-error">✗</span>
                            {/if}
                            <span class="opacity-60">{key}</span>
                            <span class="font-bold">{value}</span>
                            {#if currentValue !== value}
                                <span class="text-error">→ {currentValue}</span>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
    </div>
</div>
