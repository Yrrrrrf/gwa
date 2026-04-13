<script lang="ts">
    import { showcaseState } from "./state.svelte";
    import { m } from "$lib/i18n/messages.ts";

    // Tab definitions mapping to our 6 categories
    import Actions from "./tabs/Actions.svelte";
    import DataInput from "./tabs/DataInput.svelte";
    import Display from "./tabs/Display.svelte";
    import Feedback from "./tabs/Feedback.svelte";
    import Navigation from "./tabs/Navigation.svelte";
    import Visual from "./tabs/Visual.svelte";

    const tabs = $derived([
        { id: "actions", label: m.actions_tab_label(), component: Actions },
        { id: "input", label: m.input_tab_label(), component: DataInput },
        { id: "display", label: m.display_tab_label(), component: Display },
        { id: "feedback", label: m.feedback_tab_label(), component: Feedback },
        { id: "nav", label: m.nav_tab_label(), component: Navigation },
        { id: "visual", label: m.visual_tab_label(), component: Visual },
    ]);

    // Read the active index from shared state
    const activeIndex = $derived(showcaseState.activeTab);
    const ActiveComponent = $derived(tabs[activeIndex].component);
</script>

<div class="flex flex-col h-full overflow-hidden relative">
    <!-- Fixed Header Tab Bar -->
    <div
        class="bg-base-200/90 backdrop-blur top-0 z-10 p-3 border-b border-base-300"
    >
        <div
            role="tablist"
            class="tabs tabs-box tabs-lg w-full flex-wrap gap-1"
        >
            {#each tabs as tab, i}
                <button
                    role="tab"
                    class="tab"
                    class:tab-active={i === activeIndex}
                    onclick={() => (showcaseState.activeTab = i)}
                >
                    {tab.label}
                </button>
            {/each}
        </div>
    </div>

    <!-- Scrollable Content Area -->
    <div class="flex-1 overflow-y-auto p-6 bg-base-100/50">
        <div class="max-w-4xl mx-auto pb-12">
            <ActiveComponent />
        </div>
    </div>
</div>
