<script lang="ts">
    import {
        ThemeSelector,
        LanguageSelector,
        getAppStore,
        CurrencySelector,
    } from "rune-lab";
    import { m } from "$lib/i18n/messages.ts";

    const appStore = getAppStore();
    const isDev = true; // esm-env DEV not available in consumer, but we're always dev here
</script>

<header
    class="flex items-center justify-between px-6 py-3 bg-base-200 border-b border-base-content/10"
>
    <div class="flex items-center gap-3">
        <span class="text-xl font-black tracking-tight">RUNE-LAB</span>
        <span class="text-xl font-black tracking-tight">{m.lab_label()}</span>
        <span class="badge badge-sm badge-outline font-mono"
            >v{appStore.version}</span
        >
        {#if isDev}
            <span class="badge badge-sm badge-warning font-mono">DEV</span>
        {/if}
    </div>

    <div class="flex items-center gap-1">
        <ThemeSelector />
        <LanguageSelector />
        <CurrencySelector />
        <div class="divider divider-horizontal mx-1 opacity-20"></div>
        <kbd class="kbd kbd-sm text-xs opacity-50">ctrl+/</kbd>
    </div>
</header>
