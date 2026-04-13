<script lang="ts">
    import {
        WorkspaceLayout,
        ConnectedNavigationPanel,
        DetailPanel,
        getCommandStore,
        getShortcutStore,
        getToastStore,
        getLayoutStore,
    } from "rune-lab";
    import DashboardPanel from "../lib/components/panels/DashboardPanel.svelte";
    import ShortcutsPanel from "../lib/components/panels/ShortcutsPanel.svelte";
    import { untrack, type Snippet } from "svelte";

    let { children, sections } = $props<{
        children: Snippet;
        sections: any[];
    }>();

    const commands = getCommandStore();
    const shortcuts = getShortcutStore();
    const toasts = getToastStore();
    const layout = getLayoutStore();

    let activeDetailTab = $state("inspector");

    $effect(() => {
        untrack(() => {
            // Default Layout Commands
            commands.register({
                id: "view.toggleNav",
                label: "Toggle Navigation Panel",
                category: "View",
                action: () => layout.toggleNav(),
            });
            commands.register({
                id: "view.toggleDetail",
                label: "Toggle Detail Panel",
                category: "View",
                action: () => layout.toggleDetail(),
            });
        });

        return () => {
            shortcuts.unregister("shortcut.new");
        };
    });
</script>

<WorkspaceLayout>
    {#snippet navigationPanel()}
        <ConnectedNavigationPanel sections={sections as never} />
    {/snippet}

    {#snippet content()}
        <div class="h-full w-full overflow-y-auto bg-base-100 p-8">
            {@render children()}
        </div>
    {/snippet}

    {#snippet detailPanel()}
        <DetailPanel>
            <div class="flex flex-col h-full w-full">
                <!-- Header Tabs -->
                <div
                    class="p-4 border-b border-base-content/5 shrink-0 bg-base-100"
                >
                    <div
                        role="tablist"
                        class="tabs tabs-box tabs-sm w-full font-medium"
                    >
                        <button
                            role="tab"
                            class="tab flex-1 {activeDetailTab === 'inspector'
                                ? 'tab-active'
                                : ''}"
                            onclick={() => (activeDetailTab = "inspector")}
                        >
                            Inspector
                        </button>
                        <button
                            role="tab"
                            class="tab flex-1 {activeDetailTab === 'shortcuts'
                                ? 'tab-active'
                                : ''}"
                            onclick={() => (activeDetailTab = "shortcuts")}
                        >
                            Shortcuts
                        </button>
                    </div>
                </div>

                <!-- Content Area -->
                <div class="flex-1 overflow-y-auto p-4 bg-base-100">
                    {#if activeDetailTab === "inspector"}
                        <DashboardPanel />
                    {:else if activeDetailTab === "shortcuts"}
                        <ShortcutsPanel />
                    {/if}
                </div>
            </div>
        </DetailPanel>
    {/snippet}
</WorkspaceLayout>
