<script lang="ts">
    import ShowcaseCard from "../ShowcaseCard.svelte";
    import { m } from "$lib/i18n/messages.ts";
</script>

<div class="space-y-6">
    <!-- Hero -->
    <ShowcaseCard title={m.hero_label()} icon="🦸">
        <div class="hero bg-base-200 min-h-[300px] rounded-box">
            <div class="hero-content text-center">
                <div class="max-w-md">
                    <h1 class="text-3xl font-bold">{m.hero_title()}</h1>
                    <p class="py-4">
                        {m.hero_desc()}
                    </p>
                    <button class="btn btn-primary"
                        >{m.get_started_btn()}</button
                    >
                </div>
            </div>
        </div>
    </ShowcaseCard>

    <!-- Stack & Divider -->
    <ShowcaseCard title={m.stack_divider_label()} icon="🥞">
        <div class="flex flex-col gap-8 w-full">
            <div class="flex flex-col w-full">
                <div
                    class="grid h-20 card bg-base-300 rounded-box place-items-center"
                >
                    {m.content_label()}
                </div>
                <div class="divider">{m.or_label()}</div>
                <div
                    class="grid h-20 card bg-base-300 rounded-box place-items-center"
                >
                    {m.content_label()}
                </div>
            </div>

            <div class="stack mx-auto pt-4">
                <div class="card shadow-md bg-primary text-primary-content">
                    <div class="card-body">
                        <h2 class="card-title">
                            {m.notification_label({ count: 1 })}
                        </h2>
                        <p>{m.unread_messages_msg({ count: 3 })}</p>
                    </div>
                </div>
                <div class="card shadow bg-secondary text-secondary-content">
                    <div class="card-body">
                        <h2 class="card-title">
                            {m.notification_label({ count: 2 })}
                        </h2>
                        <p>{m.unread_messages_msg({ count: 3 })}</p>
                    </div>
                </div>
                <div class="card shadow-sm bg-accent text-accent-content">
                    <div class="card-body">
                        <h2 class="card-title">
                            {m.notification_label({ count: 3 })}
                        </h2>
                        <p>{m.unread_messages_msg({ count: 3 })}</p>
                    </div>
                </div>
            </div>
        </div>
    </ShowcaseCard>

    <!-- Mask -->
    <ShowcaseCard title={m.masks_label()} icon="🎭">
        <div class="flex flex-wrap gap-4">
            <img
                class="mask mask-squircle w-24"
                src="https://picsum.photos/200?random=1"
                alt="Squircle"
            />
            <img
                class="mask mask-heart w-24"
                src="https://picsum.photos/200?random=2"
                alt="Heart"
            />
            <img
                class="mask mask-hexagon w-24"
                src="https://picsum.photos/200?random=3"
                alt="Hexagon"
            />
            <img
                class="mask mask-decagon w-24"
                src="https://picsum.photos/200?random=4"
                alt="Decagon"
            />
            <img
                class="mask mask-parallelogram w-24"
                src="https://picsum.photos/200?random=5"
                alt="Parallelogram"
            />
            <img
                class="mask mask-star-2 w-24"
                src="https://picsum.photos/200?random=6"
                alt="Star"
            />
        </div>
    </ShowcaseCard>

    <!-- Swap -->
    <ShowcaseCard title={m.swap_label()} icon="🔄">
        <div class="flex gap-8">
            <label class="swap swap-rotate">
                <input type="checkbox" />
                <div class="swap-on text-4xl">😈</div>
                <div class="swap-off text-4xl">😇</div>
            </label>

            <label class="swap swap-flip text-9xl">
                <input type="checkbox" />
                <div class="swap-on">🥷</div>
                <div class="swap-off">🧙‍♂️</div>
            </label>
        </div>
    </ShowcaseCard>

    <!-- Custom Visual Classes (hover-3d) -->
    <ShowcaseCard title={m.custom_visual_label()} icon="🖼️">
        <div class="flex gap-6 mb-8 mt-4">
            <div
                class="hover-3d w-32 h-32 bg-primary rounded-xl flex items-center justify-center text-primary-content font-bold shadow-xl"
            >
                {m.hover_me_3d_label()}
            </div>
            <div
                class="hover-3d w-32 h-32 bg-secondary rounded-xl flex items-center justify-center text-secondary-content font-bold shadow-xl"
            >
                {m.shift_3d_label()}
            </div>
        </div>

        <div
            class="hover-gallery h-64 border border-base-content/10 rounded-box overflow-hidden mb-4"
        >
            <!-- Gallery images will overlap until hovered -->
            <img
                src="https://picsum.photos/600/400?random=21"
                alt="Gallery 1"
                class="object-cover h-full w-full"
            />
            <img
                src="https://picsum.photos/600/400?random=22"
                alt="Gallery 2"
                class="object-cover h-full w-full"
            />
            <img
                src="https://picsum.photos/600/400?random=23"
                alt="Gallery 3"
                class="object-cover h-full w-full"
            />
            <img
                src="https://picsum.photos/600/400?random=24"
                alt="Gallery 4"
                class="object-cover h-full w-full"
            />
        </div>
    </ShowcaseCard>
</div>
