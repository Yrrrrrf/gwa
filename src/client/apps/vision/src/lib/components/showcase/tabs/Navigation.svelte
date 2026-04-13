<script lang="ts">
    import ShowcaseCard from "../ShowcaseCard.svelte";
    import { Icon } from "rune-lab";
    import { m } from "$lib/i18n/messages.ts";
</script>

<div class="space-y-6">
    <!-- Navbar & Drawer -->
    <ShowcaseCard title={m.navbar_drawer_label()} icon="🧭">
        <div class="drawer">
            <input id="my-drawer-3" type="checkbox" class="drawer-toggle" />
            <div class="drawer-content flex flex-col">
                <!-- Navbar -->
                <div
                    class="w-full navbar bg-base-300 rounded-box border border-base-content/10"
                >
                    <div class="flex-none lg:hidden">
                        <label
                            for="my-drawer-3"
                            aria-label="open sidebar"
                            class="btn btn-square btn-ghost"
                        >
                            <Icon name={"menu" as never} />
                        </label>
                    </div>
                    <div
                        class="flex-1 px-2 mx-2 font-black tracking-widest uppercase"
                    >
                        {m.company_placeholder()}
                    </div>
                    <div class="flex-none hidden lg:block">
                        <ul class="menu menu-horizontal">
                            <!-- Navbar menu content here -->
                            <li><a href="#about">{m.about_label()}</a></li>
                            <li>
                                <a href="#products">{m.products_label()}</a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            <div class="drawer-side z-50">
                <label
                    for="my-drawer-3"
                    aria-label="close sidebar"
                    class="drawer-overlay"
                ></label>
                <ul class="menu p-4 w-80 min-h-full bg-base-200">
                    <!-- Sidebar content here -->
                    <li>
                        <a href="#s1">{m.sidebar_item_label({ count: 1 })}</a>
                    </li>
                    <li>
                        <a href="#s2">{m.sidebar_item_label({ count: 2 })}</a>
                    </li>
                </ul>
            </div>
        </div>
    </ShowcaseCard>

    <!-- Menus -->
    <ShowcaseCard title={m.menus_label()} icon="📜">
        <div class="flex flex-wrap gap-8 items-start">
            <ul class="menu bg-base-200 w-56 rounded-box">
                <li class="menu-title">{m.category_label({ count: 1 })}</li>
                <li><a href="#1">{m.item_label({ count: 1 })}</a></li>
                <li><a href="#2">{m.item_label({ count: 2 })}</a></li>
                <li class="menu-title">{m.category_label({ count: 2 })}</li>
                <li>
                    <details open>
                        <summary>{m.parent_label()}</summary>
                        <ul>
                            <li>
                                <a href="#sub1"
                                    >{m.submenu_label({ count: 1 })}</a
                                >
                            </li>
                            <li>
                                <a href="#sub2"
                                    >{m.submenu_label({ count: 2 })}</a
                                >
                            </li>
                        </ul>
                    </details>
                </li>
            </ul>

            <ul class="menu menu-horizontal bg-base-200 rounded-box">
                <li><a href="#h1">{m.item_label({ count: 1 })}</a></li>
                <li><a href="#h2">{m.item_label({ count: 2 })}</a></li>
                <li><a href="#h3">{m.item_label({ count: 3 })}</a></li>
            </ul>
        </div>
    </ShowcaseCard>

    <!-- Tabs & Breadcrumbs -->
    <ShowcaseCard title={m.tabs_breadcrumbs_label()} icon="📑">
        <div class="flex flex-col gap-8">
            <div role="tablist" class="tabs tabs-lifted">
                <input
                    type="radio"
                    name="my_tabs_2"
                    role="tab"
                    class="tab"
                    aria-label={m.tab_label({ count: 1 })}
                />
                <div
                    role="tabpanel"
                    class="tab-content bg-base-100 border-base-300 rounded-box p-6"
                >
                    {m.tab_content_label({ count: 1 })}
                </div>

                <input
                    type="radio"
                    name="my_tabs_2"
                    role="tab"
                    class="tab"
                    aria-label={m.tab_label({ count: 2 })}
                    checked
                />
                <div
                    role="tabpanel"
                    class="tab-content bg-base-100 border-base-300 rounded-box p-6"
                >
                    {m.tab_content_label({ count: 2 })}
                </div>

                <input
                    type="radio"
                    name="my_tabs_2"
                    role="tab"
                    class="tab"
                    aria-label={m.tab_label({ count: 3 })}
                />
                <div
                    role="tabpanel"
                    class="tab-content bg-base-100 border-base-300 rounded-box p-6"
                >
                    {m.tab_content_label({ count: 3 })}
                </div>
            </div>

            <div role="tablist" class="tabs tabs-boxed">
                <input
                    type="radio"
                    name="my_tabs_1"
                    role="tab"
                    class="tab"
                    aria-label={m.tab_label({ count: 1 })}
                />
                <input
                    type="radio"
                    name="my_tabs_1"
                    role="tab"
                    class="tab"
                    aria-label={m.tab_label({ count: 2 })}
                    checked
                />
                <input
                    type="radio"
                    name="my_tabs_1"
                    role="tab"
                    class="tab"
                    aria-label={m.tab_label({ count: 3 })}
                />
            </div>

            <div class="breadcrumbs text-sm">
                <ul>
                    <li><a href="#home">{m.home_label()}</a></li>
                    <li><a href="#docs">{m.documents_label()}</a></li>
                    <li>{m.add_document_label()}</li>
                </ul>
            </div>
        </div>
    </ShowcaseCard>

    <!-- Steps & Pagination -->
    <ShowcaseCard title={m.steps_join_label()} icon="🔢">
        <div class="flex flex-col gap-6">
            <ul class="steps w-full">
                <li class="step step-primary">{m.register_step()}</li>
                <li class="step step-primary">{m.choose_plan_step()}</li>
                <li class="step">{m.purchase_step()}</li>
                <li class="step">{m.receive_product_step()}</li>
            </ul>

            <div class="join">
                <button class="join-item btn">1</button>
                <button class="join-item btn btn-active">2</button>
                <button class="join-item btn">3</button>
                <button class="join-item btn">4</button>
            </div>
        </div>
    </ShowcaseCard>

    <!-- Dock -->
    <ShowcaseCard title={m.dock_label()} icon="📱">
        <div class="h-32 relative bg-base-200 rounded-box overflow-hidden">
            <div class="dock absolute">
                <button>
                    <Icon name={"search" as never} />
                    <span class="dock-label">{m.search_label()}</span>
                </button>
                <button class="dock-active">
                    <Icon name={"user" as never} />
                    <span class="dock-label">{m.profile_label()}</span>
                </button>
                <button>
                    <Icon name={"settings" as never} />
                    <span class="dock-label">{m.settings_label()}</span>
                </button>
            </div>
        </div>
    </ShowcaseCard>
</div>
