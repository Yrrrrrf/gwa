<script lang="ts">
    import InteractionDeck from "$lib/components/InteractionDeck.svelte";
    import LabHeader from "$lib/components/LabHeader.svelte";
    import PersistenceInspector from "$lib/components/PersistenceInspector.svelte";
    import StoresMirror from "$lib/components/StoresMirror.svelte";
    import Showcase from "$lib/components/showcase/Showcase.svelte";
</script>

<div class="flex flex-col h-full w-full overflow-hidden">
    <!-- Header Bar -->
    <LabHeader />

    <!-- 4-Quadrant Grid -->
    <div
        class="flex-1 grid grid-cols-1 lg:grid-cols-2 grid-rows-2 min-h-0 overflow-hidden"
    >
        <!-- Q1: Stores Mirror (top-left) -->
        <div class="border-r border-b border-base-content/5 overflow-hidden">
            <StoresMirror />
        </div>

        <!-- Q2: Interaction Deck (top-right) -->
        <div class="border-b border-base-content/5 overflow-hidden">
            <InteractionDeck />
        </div>

        <!-- Q3: Showcase (bottom-left) -->
        <div
            class="border-r border-base-content/5 overflow-hidden bg-base-200/50"
        >
            <Showcase />
        </div>

        <!-- Q4: Persistence Inspector (bottom-right) -->
        <div class="overflow-hidden">
            <PersistenceInspector />
        </div>
    </div>
</div>
