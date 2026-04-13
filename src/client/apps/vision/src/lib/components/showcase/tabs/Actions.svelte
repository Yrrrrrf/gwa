<script lang="ts">
    import ShowcaseCard from "../ShowcaseCard.svelte";
    import { COLORS, SIZES } from "../shared";
    import { Icon } from "rune-lab";
    import { m } from "$lib/i18n/messages.ts";
</script>

<div class="space-y-6">
    <!-- Buttons -->
    <ShowcaseCard title={m.buttons_label()} icon="🔘">
        <div class="flex flex-wrap gap-2 mb-4">
            <button class="btn">{m.default_label()}</button>
            {#each COLORS as color}
                <button class="btn btn-{color} capitalize">{color}</button>
            {/each}
        </div>

        <h4 class="text-xs font-bold opacity-50 mb-2">{m.sizes_label()}</h4>
        <div class="flex flex-wrap items-center gap-2 mb-4">
            {#each SIZES as size}
                <button class="btn btn-{size} capitalize"
                    >{m.size_abbr_label({ size })}</button
                >
            {/each}
        </div>

        <h4 class="text-xs font-bold opacity-50 mb-2">{m.styles_label()}</h4>
        <div class="flex flex-wrap gap-2 mb-4">
            <button class="btn btn-primary btn-outline"
                >{m.outline_label()}</button
            >
            <button class="btn btn-secondary btn-ghost"
                >{m.ghost_label()}</button
            >
            <button class="btn btn-accent btn-link">{m.link_label()}</button>
            <button class="btn btn-active">{m.active_label()}</button>
            <button class="btn btn-disabled" disabled
                >{m.disabled_label()}</button
            >
        </div>

        <h4 class="text-xs font-bold opacity-50 mb-2">{m.shapes_label()}</h4>
        <div class="flex gap-2">
            <button class="btn btn-square">
                <Icon name={"close" as never} />
            </button>
            <button class="btn btn-circle btn-primary">
                <Icon name={"plus" as never} />
            </button>
            <button class="btn btn-wide">{m.wide_label()}</button>
        </div>
    </ShowcaseCard>

    <!-- Badges -->
    <ShowcaseCard title={m.badges_label()} icon="🏷️">
        <div class="flex flex-wrap gap-2 mb-4">
            <div class="badge">{m.default_label()}</div>
            {#each COLORS as color}
                <div class="badge badge-{color} capitalize">{color}</div>
            {/each}
        </div>

        <h4 class="text-xs font-bold opacity-50 mb-2">{m.sizes_label()}</h4>
        <div class="flex flex-wrap items-center gap-2 mb-4">
            {#each SIZES as size}
                <div class="badge badge-primary badge-{size} capitalize">
                    {m.size_abbr_label({ size })}
                </div>
            {/each}
        </div>

        <h4 class="text-xs font-bold opacity-50 mb-2">{m.styles_label()}</h4>
        <div class="flex flex-wrap gap-2">
            <div class="badge badge-primary badge-outline">
                {m.outline_label()}
            </div>
            <div class="badge badge-secondary badge-ghost">
                {m.ghost_label()}
            </div>
        </div>
    </ShowcaseCard>

    <!-- Avatars -->
    <ShowcaseCard title={m.avatars_label()} icon="👤">
        <div class="flex flex-wrap items-end gap-4 mb-4">
            {#each [1, 2, 3, 4] as i}
                <div class="avatar">
                    <div class="w-{(i as number) * 4 + 4} rounded-full">
                        <img
                            src="https://picsum.photos/200?random={i}"
                            alt="Avatar {i}"
                        />
                    </div>
                </div>
            {/each}

            <div class="avatar online">
                <div class="w-16 rounded-full">
                    <img
                        src="https://picsum.photos/200?random=5"
                        alt="Online"
                    />
                </div>
            </div>

            <div class="avatar offline">
                <div class="w-16 rounded-full">
                    <img
                        src="https://picsum.photos/200?random=6"
                        alt="Offline"
                    />
                </div>
            </div>

            <div class="avatar placeholder">
                <div class="w-16 rounded-full bg-neutral text-neutral-content">
                    <span>{m.avatar_placeholder_label()}</span>
                </div>
            </div>
        </div>

        <h4 class="text-xs font-bold opacity-50 mb-2">
            {m.avatar_group_label()}
        </h4>
        <div class="avatar-group -space-x-6 rtl:space-x-reverse">
            {#each [7, 8, 9] as i}
                <div class="avatar">
                    <div class="w-12">
                        <img
                            src="https://picsum.photos/200?random={i}"
                            alt="Group {i}"
                        />
                    </div>
                </div>
            {/each}
            <div class="avatar placeholder">
                <div class="w-12 bg-neutral text-neutral-content">
                    <span>{m.plus_99_label()}</span>
                </div>
            </div>
        </div>
    </ShowcaseCard>

    <!-- Indicators -->
    <ShowcaseCard title={m.indicators_fabs_label()} icon="🔴">
        <div class="flex gap-8 mt-4 mb-4">
            <div class="indicator">
                <span class="indicator-item badge badge-secondary"
                    >{m.plus_99_label()}</span
                >
                <button class="btn">{m.inbox_label()}</button>
            </div>

            <div class="indicator">
                <span class="indicator-item badge badge-primary"
                    >{m.new_label()}</span
                >
                <div
                    class="grid w-24 h-24 bg-base-300 place-items-center rounded-box"
                >
                    {m.content_label()}
                </div>
            </div>

            <div class="indicator">
                <span
                    class="indicator-item indicator-bottom indicator-center badge badge-primary"
                    >{m.uploading_label()}</span
                >
                <div
                    class="grid w-24 h-24 bg-base-300 place-items-center rounded-box"
                >
                    {m.file_label()}
                </div>
            </div>
        </div>
    </ShowcaseCard>
</div>
