# daisyUI v5

> Tailwind CSS plugin providing ~58 semantic component classes + ~35 themes.
> Components are pure CSS classes (no JS). `npm i -D daisyui@latest`.

## TL;DR

- **What**: Tailwind plugin. Adds component classes (`btn`, `card`, `modal`,
  …) + themeable color tokens (`primary`, `base-100`, …).
- **Best for**: Tailwind projects that want prebuilt components + instant
  multi-theme support with zero JS.
- **Mental model**: Component class (`btn`) → style modifiers (`btn-primary`,
  `btn-outline`, `btn-lg`). Colors are **semantic** (`bg-primary`, never
  `bg-blue-500`). Themes swap CSS variables, so one markup works on all themes.
- **Anti-use**: Pure JS/React component libs (use shadcn/ui, Radix). Projects
  not using Tailwind CSS v4.

---

## Setup

```css
/* app.css — Tailwind CSS v4 + daisyUI plugin */
@import "tailwindcss";
@plugin "daisyui";
/* Optional: @plugin "daisyui" { themes: light --default, dark --prefersdark; } */
```

```html
<!-- Set the theme on <html> (or any ancestor) -->
<html data-theme="dark">
  <body>
    <button class="btn btn-primary">Click</button>
  </body>
</html>
```

CDN alternative (no build step):

```html
<link
  href="https://cdn.jsdelivr.net/npm/daisyui@5"
  rel="stylesheet"
  type="text/css"
/>
<script src="https://cdn.tailwindcss.com"></script>
```

---

## Plugin options

`@plugin "daisyui" { key: value; … }` — all optional.

| Option    | Type / values                    | Default                                    | Effect                                                                                  |
| --------- | -------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------- |
| `themes`  | `string[]` \| `"all"` \| `false` | `["light --default","dark --prefersdark"]` | which themes to bundle. `"all"` = every built-in. `false` = none.                       |
| `root`    | CSS selector                     | `":root"`                                  | where theme vars are applied                                                            |
| `include` | `string[]` (component names)     | —                                          | include only these components                                                           |
| `exclude` | `string[]` (component names)     | —                                          | omit these components                                                                   |
| `prefix`  | string                           | `""`                                       | prefix every daisyUI class + var, e.g. `"daisy-"` → `.daisy-btn`, `--daisy-alert-color` |
| `logs`    | bool                             | `true`                                     | console log on build                                                                    |

Theme flags (append to theme name, space-separated): `--default` (applied when
no `data-theme` set), `--prefersdark` (applied inside
`@media (prefers-color-scheme: dark)`).

```css
@plugin "daisyui" {
  themes: cupcake --default, dracula --prefersdark, synthwave;
  exclude: rating, carousel;
  prefix: "d-";
  logs: false;
}
```

Gotchas:

- With `prefix`, the **theme controller class** also becomes
  `<prefix>theme-controller`.
- `--color-*`, `--size-*`, `--radius-*`, `--border`, `--depth`, `--noise` are
  **never** prefixed (design-token vars stay stable).
- Single theme with `--default` skips other theme emissions entirely (perf
  optimization).

---

## Semantic colors (20 names)

Every color has a paired `-content` foreground. **Never** use `bg-blue-500` etc.
— use these.

| Color               | CSS var                     | Purpose               |
| ------------------- | --------------------------- | --------------------- |
| `primary`           | `--color-primary`           | main brand            |
| `primary-content`   | `--color-primary-content`   | fg on `primary`       |
| `secondary`         | `--color-secondary`         | secondary brand       |
| `secondary-content` | `--color-secondary-content` | fg on `secondary`     |
| `accent`            | `--color-accent`            | accent brand          |
| `accent-content`    | `--color-accent-content`    | fg on `accent`        |
| `neutral`           | `--color-neutral`           | non-saturated UI      |
| `neutral-content`   | `--color-neutral-content`   | fg on `neutral`       |
| `base-100`          | `--color-base-100`          | page background       |
| `base-200`          | `--color-base-200`          | 1st elevation surface |
| `base-300`          | `--color-base-300`          | 2nd elevation surface |
| `base-content`      | `--color-base-content`      | default text          |
| `info`              | `--color-info`              | informative           |
| `info-content`      | `--color-info-content`      | fg on `info`          |
| `success`           | `--color-success`           | success/safe          |
| `success-content`   | `--color-success-content`   | fg on `success`       |
| `warning`           | `--color-warning`           | caution               |
| `warning-content`   | `--color-warning-content`   | fg on `warning`       |
| `error`             | `--color-error`             | danger/destructive    |
| `error-content`     | `--color-error-content`     | fg on `error`         |

Usable in any of these Tailwind utilities: `bg-*`, `text-*`, `border-*`,
`ring-*`, `ring-offset-*`, `outline-*`, `shadow-*`, `fill-*`, `stroke-*`,
`from-*`, `via-*`, `to-*`, `divide-*`, `accent-*`, `caret-*`, `decoration-*`,
`placeholder-*`.

**Opacity**: `bg-primary/50`, `text-base-content/70`. Plugin mode = any 0-100.
CDN mode = only 10,20,…,90.

```html
<div class="bg-primary text-primary-content p-4">auto-themed surface</div>
<p class="text-base-content/50">muted text — consistent across all themes</p>
```

---

## Design tokens (theme-wide)

Set via `data-theme` or CSS overrides. Rarely set directly by users; themes set
them.

| Variable            | Description                           |
| ------------------- | ------------------------------------- |
| `--color-*`         | the 20 semantic colors above          |
| `--radius-selector` | radius for checkbox, toggle, badge    |
| `--radius-field`    | radius for input, select, tab, button |
| `--radius-box`      | radius for card, modal, alert         |
| `--size-selector`   | base scale for selectors              |
| `--size-field`      | base scale for fields                 |
| `--border`          | border width (all components)         |
| `--depth`           | binary 0/1 — enables depth effect     |
| `--noise`           | binary 0/1 — enables noise texture    |

Matching radius utilities: `rounded-selector`, `rounded-field`, `rounded-box`.

---

## Themes (35 built-in)

Apply with `<html data-theme="themeName">` or `<div data-theme="themeName">`
(scoped per subtree).

```
light, dark, cupcake, bumblebee, emerald, corporate, synthwave, retro,
cyberpunk, valentine, halloween, garden, forest, aqua, lofi, pastel,
fantasy, wireframe, black, luxury, dracula, cmyk, autumn, business,
acid, lemonade, night, coffee, winter, dim, nord, sunset, caramellatte,
abyss, silk
```

**Custom theme** — define via `@plugin "daisyui/theme"`:

```css
@plugin "daisyui/theme" {
  name: "mytheme";
  default: true; /* use as default */
  prefersdark: false;
  color-scheme: light; /* or dark — sets native form controls etc */
  --color-primary: oklch(60% 0.2 240);
  --color-primary-content: oklch(98% 0 0);
  --color-base-100: oklch(100% 0 0);
  /* ...any other tokens */
  --radius-box: 1rem;
  --border: 1px;
  --depth: 1;
}
```

**Theme controller** (radio input switches theme without JS):

```html
<input type="radio" name="theme" class="theme-controller" value="dracula" />
<input type="radio" name="theme" class="theme-controller" value="cupcake" />
```

When any `input.theme-controller[value=X]:checked` exists, `:root` gets theme
`X`. Use with radio buttons, hidden checkboxes, etc.

---

## Components (58)

Pattern: `<base-class>` + optional `<base-class>-<modifier>`. Full list — see
Component Recipes below for usage.

```
alert       avatar       badge        breadcrumbs   button       calendar
card        carousel     chat         checkbox      collapse     countdown
diff        divider      dock         drawer        dropdown     fab
fieldset    fileinput    filter       footer        hero         hover3d
hovergallery indicator   input        kbd           label        link
list        loading      mask         menu          mockup       modal
navbar      progress     radialprogress radio       range        rating
select      skeleton     stack        stat          status       steps
swap        tab          table        textarea      textrotate   timeline
toast       toggle       tooltip      validator
```

### Universal modifier families

Most components accept these (check each recipe for specifics):

| Family | Modifiers                                                                                  | Applies to                                                                                                     |
| ------ | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Color  | `-primary`, `-secondary`, `-accent`, `-neutral`, `-info`, `-success`, `-warning`, `-error` | alert, badge, btn, checkbox, input, loading, progress, radio, range, select, tab, textarea, toggle, tooltip, … |
| Size   | `-xs`, `-sm`, `-md`, `-lg`, `-xl`                                                          | badge, btn, input, loading, select, textarea, checkbox, toggle, radio, range, kbd, tab, file-input, …          |
| Style  | `-outline`, `-dash`, `-soft`, `-ghost`, `-link`                                            | primarily `btn`; some on `badge`, `alert`                                                                      |
| State  | `-active`, `-disabled`                                                                     | btn, menu items, tab                                                                                           |
| Shape  | `-circle`, `-square`, `-wide`, `-block`                                                    | btn                                                                                                            |

---

## Component recipes

Dense examples. Every component below follows `class="<name> <modifier>…"`
pattern.

### Button (`btn`)

```html
<button class="btn">Default</button>
<button class="btn btn-primary">Primary</button>
<button class="btn btn-secondary btn-outline">Outline secondary</button>
<button class="btn btn-accent btn-soft">Soft</button>
<button class="btn btn-ghost">Ghost</button>
<button class="btn btn-link">Link</button>
<button class="btn btn-sm btn-wide">Wide sm</button>
<button class="btn btn-circle btn-lg">+</button>
<button class="btn btn-square"><svg>…</svg></button>
<button class="btn btn-block">Full width</button>
<button class="btn" disabled>Disabled</button>
<button class="btn btn-active">Active</button>
<!-- Loading -->
<button class="btn">
  <span class="loading loading-spinner"></span>loading
</button>
```

### Card (`card`)

```html
<div class="card w-96 bg-base-100 shadow-xl">
  <figure><img src="…" /></figure>
  <div class="card-body">
    <h2 class="card-title">
      Title <span class="badge badge-secondary">NEW</span>
    </h2>
    <p>Body text.</p>
    <div class="card-actions justify-end">
      <button class="btn btn-primary">Action</button>
    </div>
  </div>
</div>
<!-- Variants -->
<div class="card card-side">…</div>
<!-- horizontal -->
<div class="card card-compact">…</div>
<!-- smaller padding -->
<div class="card card-bordered">…</div>
<!-- outlined -->
<div class="card image-full">…</div>
<!-- image as bg -->
```

### Alert (`alert`)

```html
<div class="alert alert-info"><span>Info message</span></div>
<div class="alert alert-success"><span>Saved!</span></div>
<div class="alert alert-warning"><span>Warning</span></div>
<div class="alert alert-error"><span>Error</span></div>
<div class="alert alert-soft alert-warning">soft variant</div>
<div class="alert alert-outline">outline variant</div>
<div class="alert alert-dash">dashed border</div>
<!-- Customize color inline -->
<div class="alert [--alert-color:theme(colors.purple.500)]">custom</div>
```

### Badge (`badge`)

```html
<span class="badge">default</span>
<span class="badge badge-primary badge-lg">primary lg</span>
<span class="badge badge-outline badge-success">outline success</span>
<span class="badge badge-soft badge-error">soft error</span>
<span class="badge badge-xs">xs</span>
```

### Input / Textarea / Select / File input

```html
<input type="text" placeholder="Type…" class="input input-bordered w-full" />
<input class="input input-primary input-lg" />
<input class="input input-ghost" />
<input class="input input-error" /> <!-- error state -->

<textarea class="textarea textarea-bordered textarea-primary"></textarea>

<select class="select select-bordered select-sm">
  <option>A</option>
  <option>B</option>
</select>

<input
  type="file"
  class="file-input file-input-bordered file-input-primary w-full"
/>
```

### Checkbox / Radio / Toggle

```html
<input type="checkbox" class="checkbox checkbox-primary" />
<input type="checkbox" class="checkbox checkbox-lg" />

<input type="radio" name="r" class="radio radio-success" />

<input type="checkbox" class="toggle toggle-accent" />
<input type="checkbox" class="toggle toggle-xs" />
```

### Range

```html
<input type="range" min="0" max="100" class="range range-primary range-sm" />
```

### Modal (dialog-based — preferred)

```html
<button class="btn" onclick="my_modal.showModal()">Open</button>
<dialog id="my_modal" class="modal">
  <div class="modal-box">
    <h3 class="font-bold text-lg">Hi</h3>
    <p class="py-4">Body.</p>
    <div class="modal-action">
      <form method="dialog"><button class="btn">Close</button></form>
    </div>
  </div>
  <!-- click outside to close -->
  <form method="dialog" class="modal-backdrop"><button>close</button></form>
</dialog>
<!-- Positions -->
<dialog class="modal modal-bottom sm:modal-middle">…</dialog>
<dialog class="modal modal-top">…</dialog>
```

### Drawer

```html
<div class="drawer">
  <input id="side" type="checkbox" class="drawer-toggle" />
  <div class="drawer-content">
    <label for="side" class="btn btn-primary drawer-button">Open drawer</label>
    <!-- main content -->
  </div>
  <div class="drawer-side">
    <label for="side" class="drawer-overlay"></label>
    <ul class="menu bg-base-200 min-h-full w-80 p-4">
      <li><a>Item 1</a></li>
    </ul>
  </div>
</div>
<!-- Right-side: add class="drawer drawer-end" -->
```

### Dropdown

```html
<div class="dropdown">
  <div tabindex="0" role="button" class="btn m-1">Menu</div>
  <ul
    tabindex="0"
    class="dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-2 shadow"
  >
    <li><a>One</a></li>
    <li><a>Two</a></li>
  </ul>
</div>
<!-- Position: dropdown-top | dropdown-bottom | dropdown-left | dropdown-right | dropdown-end | dropdown-hover | dropdown-open -->
```

### Menu

```html
<ul class="menu bg-base-200 rounded-box w-56">
  <li><a>Link</a></li>
  <li><a class="menu-active">Active</a></li>
  <li>
    <details open>
      <summary>Submenu</summary>
      <ul><li><a>Nested</a></li></ul>
    </details>
  </li>
</ul>
<!-- Variants: menu-horizontal, menu-vertical (default), menu-xs/sm/md/lg -->
```

### Navbar

```html
<div class="navbar bg-base-100 shadow">
  <div class="navbar-start"><a class="btn btn-ghost text-xl">Brand</a></div>
  <div class="navbar-center hidden lg:flex">
    <ul class="menu menu-horizontal"><li><a>Docs</a></li></ul>
  </div>
  <div class="navbar-end"><button class="btn btn-primary">Sign in</button></div>
</div>
```

### Tab

```html
<div role="tablist" class="tabs tabs-bordered">
  <a role="tab" class="tab">Tab 1</a>
  <a role="tab" class="tab tab-active">Tab 2</a>
  <a role="tab" class="tab">Tab 3</a>
</div>
<!-- Variants: tabs-box, tabs-border, tabs-lift ; sizes tabs-xs..lg -->
<!-- Radio-driven tabs with content -->
<div role="tablist" class="tabs tabs-lift">
  <input type="radio" name="g" role="tab" class="tab" aria-label="A" checked />
  <div role="tabpanel" class="tab-content p-4">A content</div>
  <input type="radio" name="g" role="tab" class="tab" aria-label="B" />
  <div role="tabpanel" class="tab-content p-4">B content</div>
</div>
```

### Table

```html
<div class="overflow-x-auto">
  <table class="table table-zebra table-sm">
    <thead>
      <tr>
        <th>Name</th>
        <th>Job</th>
      </tr>
    </thead>
    <tbody>
      <tr class="hover">
        <td>Alice</td>
        <td>Dev</td>
      </tr>
    </tbody>
  </table>
</div>
<!-- Modifiers: table-xs/sm/md/lg, table-zebra, table-pin-rows, table-pin-cols -->
```

### Toast + Alert (notification)

```html
<div class="toast toast-end toast-top">
  <div class="alert alert-success"><span>Saved.</span></div>
</div>
<!-- Positions: toast-start|center|end × toast-top|middle|bottom (default bottom-end) -->
```

### Tooltip

```html
<div class="tooltip tooltip-primary" data-tip="hello">
  <button class="btn">Hover</button>
</div>
<!-- tooltip-top|bottom|left|right, tooltip-open (always visible) -->
```

### Loading

```html
<span class="loading loading-spinner loading-lg text-primary"></span>
<!-- Styles: loading-spinner | loading-dots | loading-ring | loading-ball | loading-bars | loading-infinity -->
```

### Progress / Radial progress

```html
<progress class="progress progress-primary w-56" value="40" max="100">
</progress>
<div
  class="radial-progress text-primary"
  style="--value: 70"
  role="progressbar"
>
  70%
</div>
<!-- size/thickness: --size:8rem; --thickness:6px; on the element -->
```

### Avatar

```html
<div class="avatar">
  <div class="w-24 rounded-full"><img src="…" /></div>
</div>
<div class="avatar avatar-online">…</div>
<!-- status dots: -online | -offline -->
<div class="avatar avatar-placeholder">
  <div class="bg-neutral text-neutral-content w-12 rounded-full">
    <span>JD</span>
  </div>
</div>
<!-- Group -->
<div class="avatar-group -space-x-6">
  <div class="avatar"><div class="w-12"><img src="…" /></div></div>
  <div class="avatar"><div class="w-12"><img src="…" /></div></div>
</div>
```

### Stat

```html
<div class="stats shadow">
  <div class="stat">
    <div class="stat-title">Downloads</div>
    <div class="stat-value text-primary">31K</div>
    <div class="stat-desc">↗︎ 400 (22%)</div>
  </div>
</div>
<!-- Variants: stats-horizontal (default) | stats-vertical -->
```

### Steps

```html
<ul class="steps">
  <li class="step step-primary">Register</li>
  <li class="step step-primary">Verify</li>
  <li class="step">Done</li>
</ul>
<!-- steps-vertical / steps-horizontal -->
```

### Collapse / Accordion

```html
<div class="collapse collapse-arrow bg-base-200">
  <input type="checkbox" />
  <div class="collapse-title font-semibold">Click me</div>
  <div class="collapse-content"><p>Hidden content</p></div>
</div>
<!-- Modifiers: collapse-arrow | collapse-plus ; collapse-open | collapse-close to force -->
```

### Chat bubble

```html
<div class="chat chat-start">
  <div class="chat-image avatar">
    <div class="w-10 rounded-full"><img src="…" /></div>
  </div>
  <div class="chat-header">Alice</div>
  <div class="chat-bubble chat-bubble-primary">Hello</div>
  <div class="chat-footer opacity-50">Seen</div>
</div>
<div class="chat chat-end"><div class="chat-bubble">Hi!</div></div>
```

### Hero

```html
<div class="hero min-h-screen bg-base-200">
  <div class="hero-content text-center">
    <div class="max-w-md">
      <h1 class="text-5xl font-bold">Title</h1>
      <p class="py-6">Subtitle</p>
      <button class="btn btn-primary">Go</button>
    </div>
  </div>
</div>
<!-- hero-overlay for a dim layer when using bg image -->
```

### Divider

```html
<div class="divider">OR</div>
<!-- horizontal -->
<div class="divider divider-horizontal">OR</div><!-- for flex-row layouts -->
<div class="divider divider-primary">…</div>
<div class="divider divider-start">left</div>
<!-- -start | -end -->
```

### Kbd

```html
<kbd class="kbd kbd-sm">⌘</kbd> <kbd class="kbd">K</kbd>
```

### Link

```html
<a class="link link-primary">link</a>
<a class="link link-hover">hover only underline</a>
```

### Indicator / Badge on element

```html
<div class="indicator">
  <span class="indicator-item badge badge-secondary">new</span>
  <button class="btn">Inbox</button>
</div>
<!-- Positions: indicator-top|middle|bottom × indicator-start|center|end -->
```

### Swap (toggle icons)

```html
<label class="swap swap-rotate">
  <input type="checkbox" />
  <div class="swap-on">ON</div>
  <div class="swap-off">OFF</div>
</label>
<!-- Variants: swap-rotate | swap-flip ; force swap-active -->
```

### Mockup (phone / browser / code / window)

```html
<div class="mockup-browser border">
  <div class="mockup-browser-toolbar">
    <div class="input">https://example.com</div>
  </div>
  <div class="px-4 py-8">Page content</div>
</div>
<div class="mockup-code">
  <pre data-prefix="$"><code>npm i daisyui</code></pre>
</div>
<div class="mockup-phone">…</div>
<div class="mockup-window border">…</div>
```

### Countdown

```html
<span class="countdown">
  <span style="--value: 59" aria-live="polite">59</span>
</span>
```

### Rating

```html
<div class="rating">
  <input type="radio" name="r" class="mask mask-star" />
  <input type="radio" name="r" class="mask mask-star" checked />
</div>
<!-- rating-xs..lg, rating-half (with double inputs) -->
```

### Skeleton

```html
<div class="skeleton h-32 w-32"></div>
<div class="skeleton h-4 w-full"></div>
```

### Timeline

```html
<ul class="timeline timeline-vertical">
  <li>
    <div class="timeline-start">1984</div>
    <div class="timeline-middle"><span class="badge"></span></div>
    <div class="timeline-end timeline-box">Event</div>
    <hr />
  </li>
</ul>
```

### Other (terse — same `<name>-<modifier>` pattern)

- **`breadcrumbs`** — wrap `<ul>`; uses `<li>` children.
- **`carousel`** — `carousel-center | carousel-end | carousel-vertical`; items:
  `carousel-item`.
- **`dock`** — bottom navigation bar; items with `dock-label`, `dock-active`.
- **`fab`** — floating action button; composes with `btn btn-circle`.
- **`fieldset`** / **`fieldset-legend`** — semantic form grouping wrapper.
- **`filter`** — radio-group style pill filter bar (`filter-reset`).
- **`footer`** — `<footer class="footer p-10 bg-neutral text-neutral-content">`
  with nested `<nav>` blocks; `footer-horizontal`, `footer-center`.
- **`hover3d`** / **`hovergallery`** — interactive card effects.
- **`label`** — `<label class="label">` typically wraps input with helper text.
- **`list`** — `<ul class="list">` with `<li class="list-row">`,
  `list-col-grow`, `list-col-wrap`.
- **`mask`** — clip-path shape:
  `mask-squircle | mask-heart | mask-hexagon | mask-hexagon-2 | mask-decagon | mask-pentagon | mask-diamond | mask-square | mask-circle | mask-parallelogram | mask-star | mask-star-2 | mask-triangle`;
  plus `mask-half-1`, `mask-half-2`.
- **`stack`** — overlap children (useful for card stacks).
- **`status`** — tiny dot indicator;
  `status-success | -error | -warning | -info`; sizes `status-xs..lg`.
- **`textrotate`** — animated rotating words.
- **`diff`** — side-by-side comparison: `diff`, `diff-item-1`, `diff-item-2`,
  `diff-resizer`.
- **`validator`** — CSS-only form validation styling on `:invalid`.

---

## Utilities (non-color)

| Class              | Effect                                    |
| ------------------ | ----------------------------------------- |
| `glass`            | glassmorphism (backdrop-blur + tinted bg) |
| `rounded-selector` | `border-radius: var(--radius-selector)`   |
| `rounded-field`    | `border-radius: var(--radius-field)`      |
| `rounded-box`      | `border-radius: var(--radius-box)`        |

`glass` CSS vars to tweak per-element: `--glass-blur`, `--glass-opacity`,
`--glass-reflect-degree`, `--glass-reflect-opacity`, `--glass-border-opacity`,
`--glass-text-shadow-opacity`.

**Join** — group adjacent elements into a single bordered unit:

```html
<div class="join">
  <button class="btn join-item">A</button>
  <button class="btn join-item">B</button>
  <button class="btn join-item">C</button>
</div>
<!-- Vertical: join join-vertical -->
```

Join radius tokens: `--join-ss`, `--join-se`, `--join-es`, `--join-ee`.

---

## Component-internal CSS vars (advanced)

Override per-element with Tailwind arbitrary props `[--var:value]` or via CSS
`.class { --var: … }`. **Not semver-stable** — use pinned daisyUI version if
relying on these.

<details>
<summary>Full internal-var table</summary>

| Component       | Vars                                                                                                                                                                                                                                                                                                                                                       |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alert           | `--alert-color`                                                                                                                                                                                                                                                                                                                                            |
| Badge           | `--badge-color`, `--size`                                                                                                                                                                                                                                                                                                                                  |
| Button          | `--btn-color`, `--btn-fg`, `--btn-shadow`, `--btn-noise`, `--btn-p`, `--size`                                                                                                                                                                                                                                                                              |
| Card            | `--card-p`, `--card-fs`, `--cardtitle-fs`                                                                                                                                                                                                                                                                                                                  |
| Checkbox        | `--size`                                                                                                                                                                                                                                                                                                                                                   |
| Countdown       | `--value`, `--digits`                                                                                                                                                                                                                                                                                                                                      |
| Divider         | `--divider-m`                                                                                                                                                                                                                                                                                                                                              |
| Dropdown        | `--anchor-v`, `--anchor-h`                                                                                                                                                                                                                                                                                                                                 |
| File input      | `--input-color`, `--size`                                                                                                                                                                                                                                                                                                                                  |
| Hover 3D        | `--ease`, `--shadow`, `--shine`, `--transform`                                                                                                                                                                                                                                                                                                             |
| Hover Gallery   | `--items`                                                                                                                                                                                                                                                                                                                                                  |
| Indicator       | `--indicator-t/-b/-s/-e/-y/-x`                                                                                                                                                                                                                                                                                                                             |
| Input           | `--input-color`, `--size`, `--font-size`                                                                                                                                                                                                                                                                                                                   |
| Kbd             | `--size`                                                                                                                                                                                                                                                                                                                                                   |
| List            | `--list-grid-cols`                                                                                                                                                                                                                                                                                                                                         |
| Menu            | `--menu-active-fg`, `--menu-active-bg`                                                                                                                                                                                                                                                                                                                     |
| Modal           | `--modal-tl/-tr/-bl/-br`                                                                                                                                                                                                                                                                                                                                   |
| Radial progress | `--value`, `--size`, `--thickness`, `--radialprogress`                                                                                                                                                                                                                                                                                                     |
| Radio           | `--size`                                                                                                                                                                                                                                                                                                                                                   |
| Range           | `--range-bg`, `--range-thumb`, `--range-thumb-size`, `--range-progress`, `--range-fill`, `--range-p`, `--size`                                                                                                                                                                                                                                             |
| Select          | `--input-color`, `--size`                                                                                                                                                                                                                                                                                                                                  |
| Tab             | `--tabs-height`, `--tabs-direction`, `--tab-p`, `--tab-bg`, `--tab-border-color`, `--tab-radius-{ss,se,es,ee}`, `--tab-order`, `--tab-radius-min`, `--tab-paddings`, `--tab-border-colors`, `--tab-corner-{width,height,position}`, `--tab-inset`, `--radius-start/-end`, `--tabcontent-margin`, `--tabcontent-radius-{ss,se,es,ee}`, `--tabcontent-order` |
| TextRotate      | `--items`, `--duration`, `--first-item-position`                                                                                                                                                                                                                                                                                                           |
| Textarea        | `--input-color`, `--size`, `--font-size`                                                                                                                                                                                                                                                                                                                   |
| Timeline        | `--timeline-row-start/-end`, `--timeline-col-start/-end`                                                                                                                                                                                                                                                                                                   |
| Toast           | `--toast-x`, `--toast-y`                                                                                                                                                                                                                                                                                                                                   |
| Toggle          | `--toggle-p`, `--size`                                                                                                                                                                                                                                                                                                                                     |
| Tooltip         | `--tt-bg`, `--tt-off`, `--tt-tailw`                                                                                                                                                                                                                                                                                                                        |
| Glass           | see Utilities above                                                                                                                                                                                                                                                                                                                                        |
| Join            | `--join-ss/-se/-es/-ee`                                                                                                                                                                                                                                                                                                                                    |

</details>

Override example:

```html
<button class="btn [--btn-color:oklch(60%_0.2_330)]">Custom pink</button>
```

```css
.alert {
  --alert-color: theme(colors.purple.500);
}
```

---

## Gotchas

- **Always use semantic colors.** `bg-primary` works across all 35 themes;
  `bg-blue-500` breaks theming.
- Component color defaults pair fg/bg automatically — `btn-primary` sets both
  `primary` bg and `primary-content` text. Don't override fg unless needed.
- `data-theme` can be set **at any level** (scoping). Theme on
  `<section data-theme="dark">` only affects descendants.
- Theme controller requires the controller input to exist **in the tree at
  build/load**; it works via CSS `:has()` selector (no JS). Requires a modern
  browser (Chrome 105+, Safari 15.4+, Firefox 121+).
- `include`/`exclude` use the component **file name** (e.g., `"rating"`, not
  `".rating"`).
- With `prefix: "d-"`, class is `d-btn` but CSS vars like `--color-primary` are
  **not** prefixed. Only `--btn-*` etc. internal vars get the prefix.
- CDN mode limits: opacity must be a multiple of 10 (`/10`, `/20`, …, `/90`),
  arbitrary values not available.
- `--depth` and `--noise` are binary — values `0` or `1`; non-binary values
  behave unpredictably.
- Modal with `<dialog>` needs JS to open (`.showModal()`) but closes via
  form-method="dialog" without JS.
- `glass` needs a non-uniform background behind it to be visible (gradient or
  image).
- `rating` stores state via `<input type="radio">` checked state — no JS state.
- Internal CSS vars (`--btn-color`, etc.) are NOT semver-stable. Pin daisyUI
  version if you depend on them.
- Tailwind CSS v4 is required for the `@plugin` syntax. v3 users should use the
  legacy `require('daisyui')` plugin syntax.

---

## Cheat sheet

```html
<!-- SETUP (Tailwind v4 + daisyUI) -->
<style>@import "tailwindcss"; @plugin "daisyui";</style>
<html data-theme="dracula">

<!-- COLORS (semantic only) -->
bg-primary text-primary-content
bg-{primary|secondary|accent|neutral|info|success|warning|error}
bg-base-{100|200|300}  text-base-content
/* Opacity */  text-base-content/70  bg-primary/50

<!-- COMPONENT FORMULA -->
class="<component> <component>-<color> <component>-<size> <component>-<style>"
     e.g. "btn btn-primary btn-lg btn-outline"
<!-- Colors:  -primary -secondary -accent -neutral -info -success -warning -error -->
<!-- Sizes:   -xs -sm -md -lg -xl -->
<!-- Styles:  -outline -dash -soft -ghost -link -->
<!-- Shapes:  -circle -square -wide -block  (btn-only) -->
<!-- States:  -active -disabled             (disabled=attr preferred) -->

<!-- TOP 20 COMPONENTS -->
btn          card(+card-body,-title,-actions)   alert         badge
input        textarea                           select        checkbox
radio        toggle                             range         file-input
modal(<dialog>+.modal-box+.modal-action)        drawer        dropdown
menu         navbar(navbar-start/center/end)    tab/tabs      table
tooltip[data-tip]    loading(-spinner/-dots/…)  progress      stat(stats>stat)

<!-- BUILT-IN THEMES (35) -->
light dark cupcake bumblebee emerald corporate synthwave retro cyberpunk
valentine halloween garden forest aqua lofi pastel fantasy wireframe black
luxury dracula cmyk autumn business acid lemonade night coffee winter dim
nord sunset caramellatte abyss silk

<!-- PLUGIN OPTIONS -->
@plugin "daisyui" {
  themes: "light --default, dark --prefersdark";   /* or "all", false */
  include: "btn, card";
  exclude: "rating";
  prefix: "d-";
  root: ":root";
  logs: false;
}

<!-- THEME SWITCHER (no JS) -->
<input type="radio" name="theme" class="theme-controller" value="dark" />

<!-- CUSTOM THEME -->
@plugin "daisyui/theme" {
  name: "mytheme"; default: true; color-scheme: light;
  --color-primary: oklch(60% 0.2 240);
  --color-base-100: #fff;
  --radius-box: 1rem; --border: 1px;
}

<!-- TOKENS -->
rounded-{box|field|selector}                  /* radius tokens */
--radius-{box|field|selector}                 /* theme-level */
--size-{selector|field}  --border  --depth  --noise
```

**Rule of thumb**: `<element class="component-name [color] [size] [style]">` +
semantic colors + `data-theme` = themed UI in 0 lines of JS.
