<script lang="ts">
    import ShowcaseCard from "../ShowcaseCard.svelte";
    import { COLORS } from "../shared";
    import { Icon } from "rune-lab";
    import { m } from "$lib/i18n/messages.ts";
</script>

<div class="space-y-6">
    <!-- Alerts -->
    <ShowcaseCard title={m.alerts_label()} icon="⚠️">
        <div class="flex flex-col gap-2">
            <div class="alert">
                <Icon name={"info" as never} />
                <span>{m.base_alert_msg()}</span>
            </div>

            <div class="alert alert-info">
                <Icon name={"info" as never} />
                <span>{m.info_alert_msg()}</span>
            </div>

            <div class="alert alert-success">
                <Icon name={"check" as never} />
                <span>{m.success_alert_msg()}</span>
            </div>

            <div class="alert alert-warning">
                <Icon name={"info" as never} />
                <span>{m.warning_alert_msg()}</span>
            </div>

            <div class="alert alert-error">
                <Icon name={"close" as never} />
                <span>{m.error_alert_msg()}</span>
            </div>

            <div class="alert alert-soft alert-primary">
                <Icon name={"info" as never} />
                <span>{m.soft_alert_primary_msg()}</span>
            </div>
        </div>
    </ShowcaseCard>

    <!-- Cards -->
    <ShowcaseCard title={m.cards_label()} icon="🎴">
        <div class="flex flex-wrap gap-4">
            <div
                class="card w-64 bg-base-100 shadow-xl border border-base-content/10"
            >
                <figure>
                    <img
                        src="https://picsum.photos/400/200?random=11"
                        alt="Shoes"
                    />
                </figure>
                <div class="card-body">
                    <h2 class="card-title">{m.base_card_title()}</h2>
                    <p>{m.card_desc_placeholder()}</p>
                    <div class="card-actions justify-end">
                        <button class="btn btn-primary btn-sm"
                            >{m.buy_now_btn()}</button
                        >
                    </div>
                </div>
            </div>

            <div class="card w-64 bg-primary text-primary-content shadow-xl">
                <div class="card-body">
                    <h2 class="card-title">{m.primary_solid_title()}</h2>
                    <p>{m.card_desc_placeholder()}</p>
                    <div class="card-actions justify-end">
                        <button class="btn btn-sm">{m.buy_now_btn()}</button>
                    </div>
                </div>
            </div>

            <div class="card w-64 bg-base-100 shadow-xl image-full">
                <figure>
                    <img
                        src="https://picsum.photos/400/225?random=12"
                        alt="Shoes"
                    />
                </figure>
                <div class="card-body">
                    <h2 class="card-title">{m.image_full_title()}</h2>
                    <p>{m.card_desc_placeholder()}</p>
                    <div class="card-actions justify-end">
                        <button class="btn btn-primary btn-sm"
                            >{m.buy_now_btn()}</button
                        >
                    </div>
                </div>
            </div>
        </div>
    </ShowcaseCard>

    <!-- Stats -->
    <ShowcaseCard title={m.stats_label()} icon="📈">
        <div class="flex flex-col gap-4">
            <div class="stats shadow border border-base-content/10 w-full">
                <div class="stat">
                    <div class="stat-figure text-primary">
                        <Icon name={"info" as never} />
                    </div>
                    <div class="stat-title">{m.total_pageloads_label()}</div>
                    <div class="stat-value text-primary">25.6K</div>
                    <div class="stat-desc">
                        {m.more_than_last_month_msg({ percent: 21 })}
                    </div>
                </div>

                <div class="stat">
                    <div class="stat-figure text-secondary">
                        <Icon name={"check" as never} />
                    </div>
                    <div class="stat-title">{m.page_views_label()}</div>
                    <div class="stat-value text-secondary">2.6M</div>
                    <div class="stat-desc">
                        {m.more_than_last_month_msg({ percent: 21 })}
                    </div>
                </div>

                <div class="stat">
                    <div class="stat-figure text-primary">
                        <Icon name={"settings" as never} />
                    </div>
                    <div class="stat-title">{m.tasks_done_label()}</div>
                    <div class="stat-value">86%</div>
                    <div class="stat-desc text-secondary">
                        {m.tasks_remaining_msg({ count: 31 })}
                    </div>
                </div>
            </div>

            <div
                class="stats bg-primary text-primary-content border border-primary w-full"
            >
                <div class="stat">
                    <div class="stat-title">{m.account_balance_label()}</div>
                    <div class="stat-value">$89,400</div>
                    <div class="stat-actions">
                        <button class="btn btn-sm btn-success"
                            >{m.add_funds_btn()}</button
                        >
                    </div>
                </div>
                <div class="stat">
                    <div class="stat-title">{m.current_balance_label()}</div>
                    <div class="stat-value">$89,400</div>
                    <div class="stat-actions">
                        <button class="btn btn-sm">{m.withdrawal_btn()}</button>
                        <button class="btn btn-sm">{m.deposit_btn()}</button>
                    </div>
                </div>
            </div>
        </div>
    </ShowcaseCard>

    <!-- Progress & Loading -->
    <ShowcaseCard title={m.progress_loading_label()} icon="⌛">
        <div class="flex flex-col gap-8">
            <div class="flex gap-4">
                <span class="loading loading-spinner loading-xs"></span>
                <span class="loading loading-spinner loading-sm"></span>
                <span class="loading loading-spinner loading-md"></span>
                <span class="loading loading-spinner loading-lg"></span>
            </div>

            <div class="flex gap-4">
                {#each COLORS.slice(0, 4) as color}
                    <span class="loading loading-dots loading-lg text-{color}"
                    ></span>
                {/each}
            </div>

            <div class="flex flex-col gap-2 max-w-sm">
                <progress class="progress w-full"></progress>
                {#each COLORS.slice(0, 4) as color}
                    <progress
                        class="progress progress-{color} w-full"
                        value={(COLORS.indexOf(color) + 1) * 20}
                        max="100"
                    ></progress>
                {/each}
            </div>

            <div class="flex gap-4 items-center">
                <div
                    class="radial-progress"
                    style="--value:70;"
                    role="progressbar"
                >
                    70%
                </div>
                <div
                    class="radial-progress text-primary"
                    style="--value:70; --size:3rem; --thickness: 0.2rem;"
                    role="progressbar"
                >
                    70%
                </div>
                <div
                    class="radial-progress text-secondary"
                    style="--value:70; --size:4rem; --thickness: 0.4rem;"
                    role="progressbar"
                >
                    70%
                </div>
                <div
                    class="radial-progress bg-primary text-primary-content border-4 border-primary"
                    style="--value:70;"
                    role="progressbar"
                >
                    70%
                </div>
            </div>
        </div>
    </ShowcaseCard>

    <!-- Countdown & Timeline -->
    <ShowcaseCard title={m.countdown_timeline_label()} icon="⌚">
        <div class="flex flex-col gap-8">
            <div class="flex gap-5">
                <div>
                    <span class="countdown font-mono text-4xl">
                        <span style="--value:15;"></span>
                    </span>
                    {m.days_label()}
                </div>
                <div>
                    <span class="countdown font-mono text-4xl">
                        <span style="--value:10;"></span>
                    </span>
                    {m.hours_label()}
                </div>
                <div>
                    <span class="countdown font-mono text-4xl">
                        <span style="--value:24;"></span>
                    </span>
                    {m.min_label()}
                </div>
            </div>

            <ul class="timeline timeline-vertical">
                <li>
                    <div class="timeline-start">1984</div>
                    <div class="timeline-middle">
                        <Icon name={"check" as never} />
                    </div>
                    <div class="timeline-end timeline-box">
                        {m.first_macintosh_label()}
                    </div>
                    <hr class="bg-primary" />
                </li>
                <li>
                    <hr class="bg-primary" />
                    <div class="timeline-start">1998</div>
                    <div class="timeline-middle">
                        <Icon name={"check" as never} />
                    </div>
                    <div class="timeline-end timeline-box">
                        {m.imac_label()}
                    </div>
                    <hr />
                </li>
                <li>
                    <hr />
                    <div class="timeline-start">2001</div>
                    <div class="timeline-middle">
                        <Icon name={"close" as never} />
                    </div>
                    <div class="timeline-end timeline-box">
                        {m.ipod_label()}
                    </div>
                </li>
            </ul>
        </div>
    </ShowcaseCard>
</div>
