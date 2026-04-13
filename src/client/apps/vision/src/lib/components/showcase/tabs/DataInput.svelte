<script lang="ts">
    import ShowcaseCard from "../ShowcaseCard.svelte";
    import { COLORS } from "../shared";
    import { m } from "$lib/i18n/messages.ts";

    let rangeVal = $state(40);
    let toggleChecked = $state(true);
    let checkboxChecked = $state(false);
    let ratingVal = $state(3);
</script>

<div class="space-y-6">
    <!-- Input -->
    <ShowcaseCard title={m.text_input_label()} icon="⌨️">
        <div class="flex flex-col gap-4 max-w-sm">
            <input
                type="text"
                placeholder={m.type_here_placeholder()}
                class="input input-bordered w-full"
            />

            <label class="form-control w-full">
                <div class="label">
                    <span class="label-text">{m.name_question_label()}</span>
                    <span class="label-text-alt">{m.top_right_label()}</span>
                </div>
                <input
                    type="text"
                    placeholder={m.type_here_placeholder()}
                    class="input input-bordered w-full"
                />
                <div class="label">
                    <span class="label-text-alt">{m.bottom_left_label()}</span>
                    <span class="label-text-alt">{m.bottom_right_label()}</span>
                </div>
            </label>

            <div class="flex gap-2">
                <input
                    type="text"
                    placeholder={m.primary_label()}
                    class="input input-primary input-bordered w-full"
                />
                <input
                    type="text"
                    placeholder={m.error_label()}
                    class="input input-error input-bordered w-full"
                />
            </div>

            <input
                type="text"
                placeholder={m.disabled_placeholder()}
                class="input input-bordered w-full"
                disabled
            />
        </div>
    </ShowcaseCard>

    <!-- Select & Textarea -->
    <ShowcaseCard title={m.select_textarea_label()} icon="📋">
        <div class="flex flex-col gap-4 max-w-sm">
            <select class="select select-bordered w-full">
                <option disabled selected
                    >{m.best_svelte_dev_placeholder()}</option
                >
                <option>Homer</option>
                <option>Marge</option>
                <option>Bart</option>
                <option>Lisa</option>
                <option>Maggie</option>
            </select>

            <textarea
                class="textarea textarea-bordered"
                placeholder={m.bio_placeholder()}
            ></textarea>

            <textarea
                class="textarea textarea-primary"
                placeholder={m.primary_bio_placeholder()}
            ></textarea>

            <file-input class="file-input file-input-bordered w-full max-w-xs"
            ></file-input>
        </div>
    </ShowcaseCard>

    <!-- Toggles & Checkboxes -->
    <ShowcaseCard title={m.toggles_checkboxes_label()} icon="☑️">
        <div class="flex gap-12">
            <div class="flex flex-col gap-2">
                <h4 class="text-xs font-bold opacity-50 mb-2">
                    {m.checkboxes_label()}
                </h4>
                <label class="cursor-pointer label">
                    <span class="label-text mr-4">{m.default_label()}</span>
                    <input
                        type="checkbox"
                        checked={checkboxChecked}
                        class="checkbox"
                    />
                </label>
                {#each COLORS.slice(0, 4) as color}
                    <label class="cursor-pointer label">
                        <span class="label-text capitalize mr-4">{color}</span>
                        <input
                            type="checkbox"
                            checked
                            class="checkbox checkbox-{color}"
                        />
                    </label>
                {/each}
            </div>

            <div class="flex flex-col gap-2">
                <h4 class="text-xs font-bold opacity-50 mb-2">
                    {m.radios_label()}
                </h4>
                <label class="cursor-pointer label">
                    <span class="label-text mr-4">{m.red_pill_label()}</span>
                    <input
                        type="radio"
                        name="radio-1"
                        class="radio radio-error"
                        checked
                    />
                </label>
                <label class="cursor-pointer label">
                    <span class="label-text mr-4">{m.blue_pill_label()}</span>
                    <input
                        type="radio"
                        name="radio-1"
                        class="radio radio-info"
                    />
                </label>
            </div>

            <div class="flex flex-col gap-2">
                <h4 class="text-xs font-bold opacity-50 mb-2">
                    {m.toggles_label()}
                </h4>
                <label class="cursor-pointer label">
                    <span class="label-text mr-4">{m.default_label()}</span>
                    <input
                        type="checkbox"
                        class="toggle"
                        bind:checked={toggleChecked}
                    />
                </label>
                {#each COLORS.slice(0, 3) as color}
                    <label class="cursor-pointer label">
                        <span class="label-text capitalize mr-4">{color}</span>
                        <input
                            type="checkbox"
                            class="toggle toggle-{color}"
                            checked
                        />
                    </label>
                {/each}
            </div>
        </div>
    </ShowcaseCard>

    <!-- Range & Rating -->
    <ShowcaseCard title={m.range_rating_label()} icon="🎚️">
        <div class="flex flex-col gap-6 max-w-sm">
            <div>
                <h4 class="text-xs font-bold opacity-50 mb-2">
                    {m.range_label()} [{rangeVal}]
                </h4>
                <input
                    type="range"
                    min="0"
                    max="100"
                    bind:value={rangeVal}
                    class="range"
                />
            </div>

            <div>
                <h4 class="text-xs font-bold opacity-50 mb-2">
                    {m.range_with_marks_label()}
                </h4>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value="40"
                    class="range range-primary"
                    step="25"
                />
                <div class="w-full flex justify-between text-xs px-2 mt-1">
                    <span>|</span>
                    <span>|</span>
                    <span>|</span>
                    <span>|</span>
                    <span>|</span>
                </div>
            </div>

            <div>
                <h4 class="text-xs font-bold opacity-50 mb-2">
                    {m.rating_label()} [{ratingVal}]
                </h4>
                <div class="rating">
                    <input
                        type="radio"
                        name="rating-2"
                        class="mask mask-star-2 bg-orange-400"
                    />
                    <input
                        type="radio"
                        name="rating-2"
                        class="mask mask-star-2 bg-orange-400"
                    />
                    <input
                        type="radio"
                        name="rating-2"
                        class="mask mask-star-2 bg-orange-400"
                        bind:group={ratingVal}
                        value={3}
                    />
                    <input
                        type="radio"
                        name="rating-2"
                        class="mask mask-star-2 bg-orange-400"
                        bind:group={ratingVal}
                        value={4}
                    />
                    <input
                        type="radio"
                        name="rating-2"
                        class="mask mask-star-2 bg-orange-400"
                    />
                </div>
            </div>

            <div>
                <h4 class="text-xs font-bold opacity-50 mb-2">
                    {m.half_rating_label()}
                </h4>
                <div class="rating rating-half">
                    <input
                        type="radio"
                        name="rating-10"
                        class="rating-hidden"
                    />
                    <input
                        type="radio"
                        name="rating-10"
                        class="bg-green-500 mask mask-star-2 mask-half-1"
                    />
                    <input
                        type="radio"
                        name="rating-10"
                        class="bg-green-500 mask mask-star-2 mask-half-2"
                    />
                    <input
                        type="radio"
                        name="rating-10"
                        class="bg-green-500 mask mask-star-2 mask-half-1"
                        checked
                    />
                    <input
                        type="radio"
                        name="rating-10"
                        class="bg-green-500 mask mask-star-2 mask-half-2"
                    />
                </div>
            </div>
        </div>
    </ShowcaseCard>

    <!-- Fieldset & Validator -->
    <ShowcaseCard title={m.fieldset_forms_label()} icon="📝">
        <fieldset
            class="fieldset w-xs bg-base-200 border border-base-300 p-4 rounded-box"
        >
            <legend class="fieldset-legend"
                >{m.login_validation_legend()}</legend
            >
            <label class="fieldset-label" for="emailInput"
                >{m.email_label()}</label
            >
            <input
                id="emailInput"
                type="email"
                class="input validator w-full"
                required
                placeholder="mail@site.com"
            />
            <div class="validator-hint hidden">{m.email_hint()}</div>
            <label class="fieldset-label" for="passInput"
                >{m.password_label()}</label
            >
            <input
                id="passInput"
                type="password"
                class="input validator w-full"
                required
                placeholder={m.password_label()}
                minlength="8"
            />
            <p class="validator-hint hidden">{m.password_hint()}</p>
            <button class="btn btn-neutral mt-4">{m.login_btn()}</button>
        </fieldset>
    </ShowcaseCard>
</div>
