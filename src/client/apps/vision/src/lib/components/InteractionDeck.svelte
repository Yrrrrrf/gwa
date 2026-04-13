<script lang="ts">
    import {
        getToastStore,
        getShortcutStore,
        getCommandStore,
        getLayoutStore,
    } from "rune-lab";
    import { m } from "$lib/i18n/messages.ts";

    const toastStore = getToastStore();
    const shortcutStore = getShortcutStore();
    const commandStore = getCommandStore();
    const layoutStore = getLayoutStore();

    // ── Toast Cannon ─────────────────────────────────────────
    let toastDuration = $state(3000);

    function fireToast(type: "info" | "success" | "warning" | "error") {
        toastStore.send(
            `Test ${type} toast at ${new Date().toLocaleTimeString()}`,
            type,
            toastDuration,
        );
    }

    function floodToasts() {
        const types = ["info", "success", "warning", "error", "info"] as const;
        types.forEach((t, i) => {
            setTimeout(() => fireToast(t), i * 100);
        });
    }

    // ── Shortcut Lab ─────────────────────────────────────────
    let testShortcutKey = $state("ctrl+alt+h");
    let testShortcutLabel = $state("Test Shortcut");
    let testShortcutRegistered = $state(false);

    function registerTestShortcut() {
        shortcutStore.register({
            id: "lab:test-shortcut",
            keys: testShortcutKey,
            label: testShortcutLabel,
            category: m.lab_label(),
            scope: "global",
            handler: () => toastStore.success(`"${testShortcutLabel}" fired!`),
        });
        testShortcutRegistered = true;
    }

    function unregisterTestShortcut() {
        shortcutStore.unregister("lab:test-shortcut");
        testShortcutRegistered = false;
    }

    // ── Command Palette ──────────────────────────────────────
    let commandsRegistered = $state(false);

    function registerMockCommands() {
        commandStore.register({
            id: "lab:greet",
            label: "Say Hello",
            category: m.lab_label(),
            icon: "👋",
            action: () => toastStore.success("Hello from the Lab!"),
        });
        commandStore.register({
            id: "lab:random",
            label: "Random Number",
            category: m.lab_label(),
            icon: "🎲",
            action: () =>
                toastStore.info(`Random: ${Math.floor(Math.random() * 100)}`),
        });
        commandStore.register({
            id: "lab:nested",
            label: "Nested Commands",
            category: m.lab_label(),
            icon: "📂",
            children: [
                {
                    id: "lab:nested:a",
                    label: "Sub-command A",
                    action: () => toastStore.info("Sub A executed"),
                },
                {
                    id: "lab:nested:b",
                    label: "Sub-command B",
                    action: () => toastStore.info("Sub B executed"),
                },
            ],
        });
        commandsRegistered = true;
    }

    function unregisterMockCommands() {
        commandStore.unregister("lab:greet");
        commandStore.unregister("lab:random");
        commandStore.unregister("lab:nested");
        commandsRegistered = false;
    }
</script>

<div class="h-full overflow-y-auto p-4 space-y-2">
    <h2
        class="text-xs font-black uppercase tracking-widest text-primary/70 mb-3"
    >
        {m.interaction_deck_label()}
    </h2>

    <!-- Toast Cannon -->
    <details open class="collapse collapse-arrow bg-base-200">
        <summary class="collapse-title text-sm font-bold min-h-0 py-2"
            >🔔 {m.toast_cannon_label()}</summary
        >
        <div class="collapse-content space-y-2">
            <div class="join flex-wrap">
                <button
                    class="btn btn-xs btn-info join-item"
                    onclick={() => fireToast("info")}
                    >{m.fire_toast_info()}</button
                >
                <button
                    class="btn btn-xs btn-success join-item"
                    onclick={() => fireToast("success")}
                    >{m.fire_toast_success()}</button
                >
                <button
                    class="btn btn-xs btn-warning join-item"
                    onclick={() => fireToast("warning")}
                    >{m.fire_toast_warning()}</button
                >
                <button
                    class="btn btn-xs btn-error join-item"
                    onclick={() => fireToast("error")}
                    >{m.fire_toast_error()}</button
                >
                <button
                    class="btn btn-xs btn-accent join-item"
                    onclick={floodToasts}>🌊 {m.flood_toasts_label()}</button
                >
            </div>
            <label class="flex items-center gap-2 text-xs">
                <span class="opacity-60">{m.duration_label()}:</span>
                <input
                    type="range"
                    min="0"
                    max="5000"
                    step="500"
                    class="range range-xs range-primary flex-1"
                    bind:value={toastDuration}
                />
                <span class="font-mono w-12 text-right"
                    >{toastDuration === 0 ? "∞" : `${toastDuration}ms`}</span
                >
            </label>
        </div>
    </details>

    <!-- Shortcut Lab -->
    <details class="collapse collapse-arrow bg-base-200">
        <summary class="collapse-title text-sm font-bold min-h-0 py-2"
            >⚡ {m.shortcut_lab_label()}</summary
        >
        <div class="collapse-content space-y-2">
            <div class="flex gap-2">
                <input
                    type="text"
                    class="input input-xs input-bordered flex-1"
                    placeholder={m.key_combo_placeholder()}
                    bind:value={testShortcutKey}
                />
                <input
                    type="text"
                    class="input input-xs input-bordered flex-1"
                    placeholder={m.label_placeholder()}
                    bind:value={testShortcutLabel}
                />
            </div>
            <div class="join">
                {#if !testShortcutRegistered}
                    <button
                        class="btn btn-xs btn-primary join-item"
                        onclick={registerTestShortcut}
                        >{m.register_btn()}</button
                    >
                {:else}
                    <button
                        class="btn btn-xs btn-error join-item"
                        onclick={unregisterTestShortcut}
                        >{m.unregister_btn()}</button
                    >
                {/if}
            </div>
            <p class="text-xs opacity-50">
                {m.total_shortcuts_label({
                    count: shortcutStore.entries.length,
                })}
            </p>
        </div>
    </details>

    <!-- Command Palette -->
    <details class="collapse collapse-arrow bg-base-200">
        <summary class="collapse-title text-sm font-bold min-h-0 py-2"
            >📋 {m.command_palette_label()}</summary
        >
        <div class="collapse-content space-y-2">
            <div class="join">
                {#if !commandsRegistered}
                    <button
                        class="btn btn-xs btn-primary join-item"
                        onclick={registerMockCommands}
                        >{m.register_commands_btn()}</button
                    >
                {:else}
                    <button
                        class="btn btn-xs btn-error join-item"
                        onclick={unregisterMockCommands}
                        >{m.unregister_all_btn()}</button
                    >
                {/if}
            </div>
            <p class="text-xs opacity-50">
                {@html m.open_palette_hint({
                    kbd: '<kbd class="kbd kbd-xs">Ctrl+Shift+K</kbd>',
                })}
            </p>
            <p class="text-xs opacity-50">
                {m.registered_label({ count: commandStore.commands.length })}
            </p>
        </div>
    </details>
</div>
