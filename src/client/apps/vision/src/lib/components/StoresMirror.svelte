<script lang="ts">
    import {
        getAppStore,
        getToastStore,
        getThemeStore,
        getLanguageStore,
        getCurrencyStore,
        getShortcutStore,
        getLayoutStore,
        getCommandStore,
    } from "rune-lab";
    import { m } from "$lib/i18n/messages.ts";

    const appStore = getAppStore();
    const toastStore = getToastStore();
    const themeStore = getThemeStore();
    const languageStore = getLanguageStore();
    const currencyStore = getCurrencyStore();
    const shortcutStore = getShortcutStore();
    const layoutStore = getLayoutStore();
    const commandStore = getCommandStore();
</script>

<div class="h-full overflow-y-auto p-4">
    <h2
        class="text-xs font-black uppercase tracking-widest text-primary/70 mb-4"
    >
        {m.stores_mirror_label()}
    </h2>

    <div class="grid grid-cols-2 gap-3">
        <!-- AppStore -->
        <div class="card bg-base-200">
            <div class="card-body p-3 gap-1">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold opacity-60">AppStore</span>
                    <div class="status status-success status-sm"></div>
                </div>
                <p class="text-sm font-medium truncate">{appStore.name}</p>
                <p class="text-xs font-mono opacity-50">{appStore.version}</p>
            </div>
        </div>

        <!-- ToastStore -->
        <div class="card bg-base-200">
            <div class="card-body p-3 gap-1">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold opacity-60">ToastStore</span>
                    <span class="badge badge-xs badge-ghost"
                        >{toastStore.toasts.length}</span
                    >
                </div>
                <p class="text-xs opacity-50">
                    {toastStore.toasts.length > 0
                        ? m.last_toast_label({
                              type:
                                  toastStore.toasts[
                                      toastStore.toasts.length - 1
                                  ]?.type ?? "",
                          })
                        : m.no_active_toasts_label()}
                </p>
            </div>
        </div>

        <!-- ThemeStore -->
        <div class="card bg-base-200">
            <div class="card-body p-3 gap-1">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold opacity-60">ThemeStore</span>
                    <div class="status status-success status-sm"></div>
                </div>
                <p class="text-sm font-medium">
                    {themeStore.getProp("icon")}
                    {themeStore.current}
                </p>
            </div>
        </div>

        <!-- LanguageStore -->
        <div class="card bg-base-200">
            <div class="card-body p-3 gap-1">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold opacity-60"
                        >LanguageStore</span
                    >
                    <div class="status status-success status-sm"></div>
                </div>
                <p class="text-sm font-medium">
                    {languageStore.getProp("flag")}
                    {languageStore.current}
                </p>
            </div>
        </div>

        <!-- CurrencyStore -->
        <div class="card bg-base-200">
            <div class="card-body p-3 gap-1">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold opacity-60"
                        >CurrencyStore</span
                    >
                    <div class="status status-success status-sm"></div>
                </div>
                <p class="text-sm font-medium">
                    {currencyStore.getProp("symbol")}
                    {currencyStore.current}
                </p>
            </div>
        </div>

        <!-- ShortcutStore -->
        <div class="card bg-base-200">
            <div class="card-body p-3 gap-1">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold opacity-60"
                        >ShortcutStore</span
                    >
                    <span class="badge badge-xs badge-ghost"
                        >{shortcutStore.entries.length}</span
                    >
                </div>
                <p class="text-xs opacity-50">
                    {m.palette_status_label({
                        status: shortcutStore.showPalette
                            ? m.open_label()
                            : m.closed_label(),
                    })}
                </p>
            </div>
        </div>

        <!-- LayoutStore -->
        <div class="card bg-base-200">
            <div class="card-body p-3 gap-1">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold opacity-60">LayoutStore</span
                    >
                    <div
                        class="status status-sm"
                        class:status-success={layoutStore.navOpen}
                        class:status-warning={!layoutStore.navOpen}
                    ></div>
                </div>
                <p class="text-xs opacity-50">
                    {m.nav_status_label({
                        status: layoutStore.navOpen
                            ? m.open_label()
                            : m.closed_label(),
                    })} · {m.detail_status_label({
                        status: layoutStore.detailOpen
                            ? m.open_label()
                            : m.closed_label(),
                    })}
                </p>
            </div>
        </div>

        <!-- CommandStore -->
        <div class="card bg-base-200">
            <div class="card-body p-3 gap-1">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold opacity-60"
                        >CommandStore</span
                    >
                    <span class="badge badge-xs badge-ghost"
                        >{commandStore.commands.length}</span
                    >
                </div>
                <p class="text-xs opacity-50">
                    {m.registered_commands_label()}
                </p>
            </div>
        </div>
    </div>
</div>
