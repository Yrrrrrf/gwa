<script lang="ts">
    import {
        getAppStore,
        getThemeStore,
        getLanguageStore,
        getToastStore,
        getShortcutStore,
    } from "rune-lab";
    import { onMount, untrack } from "svelte";
    import { m } from "$lib/i18n/messages.ts";

    const appStore = getAppStore();
    const themeStore = getThemeStore();
    const languageStore = getLanguageStore();
    const toastStore = getToastStore();
    const shortcutStore = getShortcutStore();

    let isBeating = $state(false);
    let stateHash = $derived(
        [
            appStore.name,
            themeStore.current,
            toastStore.toasts.length,
            shortcutStore.entries.length,
        ].join("-"),
    );

    // Activity Log
    let logs: Array<{ id: number; time: Date; message: string }> = $state([]);
    let logId = 0;

    // Track state changes to add logs
    let previousHash = untrack(() => stateHash);

    $effect(() => {
        const currentHash = stateHash;
        if (currentHash !== previousHash) {
            untrack(() => {
                isBeating = true;
                logs.unshift({
                    id: ++logId,
                    time: new Date(),
                    message: m.state_updated_msg(),
                });
                if (logs.length > 10) logs.pop();
                setTimeout(() => {
                    isBeating = false;
                }, 300);
            });
            previousHash = currentHash;
        }
    });

    onMount(() => {
        logs.push({
            id: ++logId,
            time: new Date(),
            message: m.dashboard_initialized_msg(),
        });
    });
</script>

<div class="flex flex-col gap-4 h-full relative">
    <!-- Header -->
    <div class="flex items-center justify-between">
        <h3 class="font-bold text-lg">{m.system_pulse_label()}</h3>
        <div>
            {#if isBeating}
                <span class="status status-primary animate-ping"></span>
            {:else}
                <span class="status"></span>
            {/if}
        </div>
    </div>

    <!-- Snapshot Table -->
    <div class="card bg-base-100 shadow-xl border border-base-content/5">
        <div class="card-body p-4 gap-0">
            <h4 class="card-title text-sm mb-2 opacity-70">
                {m.live_state_label()}
            </h4>
            <div class="overflow-x-auto">
                <table class="table table-xs">
                    <tbody>
                        <tr class="hover">
                            <td class="opacity-50">{m.current_theme()}</td>
                            <td class="font-mono">{themeStore.current}</td>
                        </tr>
                        <tr class="hover">
                            <td class="opacity-50">{m.current_language()}</td>
                            <td class="font-mono">{languageStore.current}</td>
                        </tr>
                        <tr class="hover">
                            <td class="opacity-50">{m.active_toasts()}</td>
                            <td class="font-mono"
                                >{toastStore.toasts.length}
                                {m.active_label()}</td
                            >
                        </tr>
                        <tr class="hover">
                            <td class="opacity-50">{m.commands_label()}</td>
                            <td class="font-mono"
                                >{shortcutStore.entries.length}
                                {m.registered_abbr_label()}</td
                            >
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Controls -->
    <div class="card bg-base-100 shadow-xl border border-base-content/5">
        <div class="card-body p-4 gap-2">
            <h4 class="card-title text-sm opacity-70">{m.controls_label()}</h4>
            <div class="grid grid-cols-2 gap-2">
                <button
                    class="btn btn-xs btn-outline btn-info"
                    onclick={() => toastStore.info("This is an info toast")}
                >
                    {m.info_toast_btn()}
                </button>
                <button
                    class="btn btn-xs btn-outline btn-success"
                    onclick={() => toastStore.success("Operation successful")}
                >
                    {m.success_toast_btn()}
                </button>
                <button
                    class="btn btn-xs btn-outline btn-warning"
                    onclick={() => toastStore.warn("This is a warning")}
                >
                    {m.warning_toast_btn()}
                </button>
                <button
                    class="btn btn-xs btn-outline btn-error"
                    onclick={() => toastStore.error("Operation failed")}
                >
                    {m.error_toast_btn()}
                </button>
                <button
                    class="btn btn-xs btn-outline col-span-2"
                    onclick={() => {
                        const currentIndex = themeStore.available.findIndex(
                            (t) => t.name === themeStore.current,
                        );
                        const nextIndex =
                            (currentIndex + 1) % themeStore.available.length;
                        themeStore.set(themeStore.available[nextIndex].name);
                    }}
                >
                    {m.cycle_theme_btn()}
                </button>
            </div>
        </div>
    </div>

    <!-- Activity Log -->
    <div
        class="card bg-base-100 shadow-xl flex-1 border border-base-content/5 min-h-0"
    >
        <div class="card-body p-4 gap-0 overflow-y-auto">
            <h4 class="card-title text-sm mb-4 opacity-70">
                {m.activity_log_label()}
            </h4>
            {#if logs.length === 0}
                <div class="p-4 text-center opacity-50 text-sm italic">
                    {m.no_activity_yet_msg()}
                </div>
            {:else}
                <ul class="timeline timeline-vertical timeline-compact ml-2">
                    {#each logs as log, i (log.id)}
                        <li>
                            {#if i !== 0}
                                <hr class="bg-primary/20" />
                            {/if}
                            <div class="timeline-middle text-primary">
                                <span class="status status-primary status-sm"
                                ></span>
                            </div>
                            <div
                                class="timeline-end timeline-box bg-transparent border-0 text-xs shadow-none py-1"
                            >
                                <span class="opacity-50 mr-2">
                                    {log.time.toLocaleTimeString([], {
                                        hour12: false,
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        second: "2-digit",
                                    })}
                                </span>
                                {log.message}
                            </div>
                            {#if i !== logs.length - 1}
                                <hr class="bg-primary/20" />
                            {/if}
                        </li>
                    {/each}
                </ul>
            {/if}
        </div>
    </div>
</div>
