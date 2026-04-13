<script lang="ts">
    import ShowcaseCard from "../ShowcaseCard.svelte";
    import { getToastStore } from "rune-lab";
    import { m } from "$lib/i18n/messages.ts";

    const toastStore = getToastStore();

    function fireToast(type: "info" | "success" | "warning" | "error") {
        toastStore.send(m.toast_context_msg({ type }), type, 3000);
    }
</script>

<div class="space-y-6">
    <!-- Toasts -->
    <ShowcaseCard title={m.toasts_feedback_label()} icon="🍞">
        <div class="flex flex-wrap gap-2 mb-2">
            <button
                class="btn btn-info btn-sm"
                onclick={() => fireToast("info")}>{m.info_toast_btn()}</button
            >
            <button
                class="btn btn-success btn-sm"
                onclick={() => fireToast("success")}
                >{m.success_toast_btn()}</button
            >
            <button
                class="btn btn-warning btn-sm"
                onclick={() => fireToast("warning")}
                >{m.warning_toast_btn()}</button
            >
            <button
                class="btn btn-error btn-sm"
                onclick={() => fireToast("error")}>{m.error_toast_btn()}</button
            >
        </div>
        <p class="text-xs opacity-50">{m.toast_region_desc()}</p>
    </ShowcaseCard>

    <!-- Modals -->
    <ShowcaseCard title={m.modals_label()} icon="🪟">
        <div class="flex gap-2">
            <!-- Normal dialog -->
            <button
                class="btn btn-primary"
                onclick={() =>
                    (
                        document.getElementById(
                            "my_modal_1",
                        ) as HTMLDialogElement
                    ).showModal()}>{m.open_modal_btn()}</button
            >
            <dialog id="my_modal_1" class="modal">
                <div class="modal-box">
                    <h3 class="text-lg font-bold">{m.hello_msg()}</h3>
                    <p class="py-4">{m.modal_close_hint()}</p>
                    <div class="modal-action">
                        <form method="dialog">
                            <button class="btn">{m.close_btn()}</button>
                        </form>
                    </div>
                </div>
            </dialog>

            <!-- Dialog with backdrop click close -->
            <button
                class="btn"
                onclick={() =>
                    (
                        document.getElementById(
                            "my_modal_2",
                        ) as HTMLDialogElement
                    ).showModal()}>{m.open_modal_backdrop_btn()}</button
            >
            <dialog id="my_modal_2" class="modal">
                <div class="modal-box">
                    <h3 class="text-lg font-bold">{m.hello_msg()}</h3>
                    <p class="py-4">{m.modal_backdrop_hint()}</p>
                </div>
                <form method="dialog" class="modal-backdrop">
                    <button>{m.close_btn()}</button>
                </form>
            </dialog>
        </div>
    </ShowcaseCard>

    <!-- Tooltips -->
    <ShowcaseCard title={m.tooltips_label()} icon="💬">
        <div class="flex flex-wrap gap-4 mt-4">
            <div
                class="tooltip tooltip-bottom"
                data-tip={m.bottom_tooltip_msg()}
            >
                <button class="btn"
                    >{m.hover_me_label({ pos: "bottom" })}</button
                >
            </div>
            <div
                class="tooltip tooltip-top tooltip-primary"
                data-tip={m.primary_tooltip_msg()}
            >
                <button class="btn btn-primary"
                    >{m.hover_me_label({ pos: "top" })}</button
                >
            </div>
            <div
                class="tooltip tooltip-right tooltip-secondary"
                data-tip={m.secondary_tooltip_msg()}
            >
                <button class="btn btn-secondary"
                    >{m.hover_me_label({ pos: "right" })}</button
                >
            </div>
        </div>
    </ShowcaseCard>

    <!-- Skeleton -->
    <ShowcaseCard title={m.skeletons_label()} icon="🦴">
        <div class="flex flex-col gap-4 w-52">
            <div class="flex gap-4 items-center">
                <div class="skeleton w-16 h-16 rounded-full shrink-0"></div>
                <div class="flex flex-col gap-4">
                    <div class="skeleton h-4 w-20"></div>
                    <div class="skeleton h-4 w-28"></div>
                </div>
            </div>
            <div class="skeleton h-32 w-full"></div>
        </div>
    </ShowcaseCard>

    <!-- Diff & Collapse -->
    <ShowcaseCard title={m.diff_collapse_label()} icon="🔍">
        <div class="flex flex-col gap-4">
            <div class="collapse collapse-arrow bg-base-200">
                <input type="radio" name="my-accordion-2" checked />
                <div class="collapse-title text-xl font-medium">
                    {m.accordion_title()}
                </div>
                <div class="collapse-content">
                    <p>{m.hello_label()}</p>
                </div>
            </div>
            <div class="collapse collapse-arrow bg-base-200">
                <input type="radio" name="my-accordion-2" />
                <div class="collapse-title text-xl font-medium">
                    {m.accordion_title()}
                </div>
                <div class="collapse-content">
                    <p>{m.hello_label()}</p>
                </div>
            </div>

            <div class="diff aspect-[16/9] mt-4 rounded-box">
                <div class="diff-item-1">
                    <div
                        class="bg-primary text-primary-content grid place-content-center text-4xl font-black"
                    >
                        DAISYUI
                    </div>
                </div>
                <div class="diff-item-2">
                    <div
                        class="bg-base-200 grid place-content-center text-4xl font-black"
                    >
                        DAISYUI
                    </div>
                </div>
                <div class="diff-resizer"></div>
            </div>
        </div>
    </ShowcaseCard>
</div>
