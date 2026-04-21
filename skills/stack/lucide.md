# @lucide/svelte

> Lucide icon set for Svelte 5. 1694 icons. Commit `f0eaba8`.

## TL;DR

- **What**: SVG icon components auto-generated from `/icons/*.json`. Each icon
  is its own `.svelte` file → full tree-shaking.
- **Best for**: Svelte 5 apps needing a large, consistent stroke-icon set with
  runtime-tunable size/color/stroke.
- **Mental model**: every icon is a thin wrapper over a shared `<Icon>` that
  renders `<svg>` + the icon's `iconNode` (array of `[tag, attrs]` tuples).
- **Anti-use**: don't pick this if you only need 2-3 icons (just inline the
  SVG); don't pick if you need filled/duotone icons (lucide is stroke-only).

## Setup

```sh
pnpm add @lucide/svelte
```

```svelte
<!-- App.svelte -->
<script lang="ts">
  import { Smile } from '@lucide/svelte';
  // or tree-shaken: import Smile from '@lucide/svelte/icons/smile';
</script>

<Smile size={32} color="red" strokeWidth={1.5} />
```

Tree-shaken path uses kebab-case filenames:
`@lucide/svelte/icons/arrow-big-down`. Named import uses PascalCase:
`ArrowBigDown`. See [Appendix A](#appendix-a--icon-names) for the full name
list.

---

## Exports

| Export                         | Kind                                      | Source                   |
| ------------------------------ | ----------------------------------------- | ------------------------ |
| `Icon`                         | generic component (render any `iconNode`) | `./Icon.svelte`          |
| `<PascalName>`                 | one component per icon (1694 of them)     | `./icons/index.js`       |
| `icons`                        | namespace object of all icons             | `./icons/index.js`       |
| aliases (e.g. `Pen` → `Edit2`) | re-exports with legacy names              | `./aliases/index.js`     |
| `defaultAttributes`            | default `<svg>` attrs object              | `./defaultAttributes.js` |
| `setLucideProps`               | set global defaults via context           | `./context.js`           |
| `getLucideContext`             | read global defaults                      | `./context.js`           |
| `IconProps` / `LucideProps`    | prop type                                 | `./types.js`             |
| `IconNode`                     | `[tag, attrs][]` path data type           | `./types.js`             |
| `LucideIcon`                   | `Component<LucideProps>`                  | `./types.js`             |
| `LucideGlobalContext`          | context value shape                       | `./context.js`           |
| `Attrs`                        | `SVGAttributes<SVGSVGElement>`            | `./types.js`             |

One alias verified in tests: `Pen === Edit2`. More aliases are generated from
`build-icons --withAliases`.

---

## Props (`LucideProps` / `IconProps`)

`LucideProps extends SVGAttributes<SVGSVGElement>` — so any valid `<svg>`
attribute works (`style`, `id`, `aria-*`, event handlers, etc.).

| Prop                  | Type               | Default          | Effect                                                                                  |
| --------------------- | ------------------ | ---------------- | --------------------------------------------------------------------------------------- |
| `name`                | `string?`          | `undefined`      | Adds `lucide-${name}` class. Pre-set on generated icons (e.g. Smile → `lucide-smile`).  |
| `color`               | `string?`          | `'currentColor'` | Applied to `stroke` attribute.                                                          |
| `size`                | `number \| string` | `24`             | Sets both `width` and `height` (px).                                                    |
| `strokeWidth`         | `number \| string` | `2`              | `stroke-width` attribute.                                                               |
| `absoluteStrokeWidth` | `boolean`          | `false`          | If true, rescales stroke: `strokeWidth * 24 / size`. See [gotcha](#gotchas).            |
| `iconNode`            | `IconNode`         | `[]`             | Array of `[tag, attrs]` tuples. Pre-set on named icons; pass manually to bare `<Icon>`. |
| `children`            | `Snippet`          | —                | Extra children inside `<svg>` (e.g. `<title>Label</title>`).                            |
| `title`               | `string?`          | —                | Reserved — presence disables auto `aria-hidden`.                                        |
| `class`               | `string?`          | —                | Appended to `lucide-icon lucide lucide-${name}`.                                        |
| any `SVGAttributes`   | various            | —                | Forwarded to `<svg>` via spread.                                                        |

### Accessibility behavior (auto-`aria-hidden`)

The component sets `aria-hidden="true"` **unless any of** the following is
present:

- any `aria-*` prop (e.g. `aria-label`)
- `title` prop
- `children` content (assumed to be a `<title>` or similar)

Passing `aria-hidden="false"` explicitly overrides and wins.

```svelte
<Smile />                              <!-- aria-hidden="true" -->
<Smile aria-label="happy" />           <!-- no aria-hidden -->
<Smile title="happy" />                <!-- no aria-hidden -->
<Smile><title>happy</title></Smile>    <!-- no aria-hidden -->
<Smile aria-hidden="false" />          <!-- aria-hidden="false" -->
```

---

## Global defaults via context

Set defaults for every `<Icon>` rendered below in the tree. Per-component props
still win.

```svelte
<!-- +layout.svelte -->
<script>
  import { setLucideProps } from '@lucide/svelte';
  setLucideProps({ size: 32, color: 'red', strokeWidth: 1, class: 'my-icons' });
</script>
{@render children()}
```

`LucideGlobalContext`:

```ts
interface LucideGlobalContext {
  color?: string;
  size?: number;
  strokeWidth?: number;
  absoluteStrokeWidth?: boolean;
  class?: string;
}
```

Priority: **explicit prop > context value > hard default**. Context must be set
in a parent's `<script>` (runs during component setup); reading via
`getLucideContext()` returns `undefined` if no ancestor called `setLucideProps`.

---

## `iconNode` shape

```ts
type IconNodeElements =
  | "circle"
  | "ellipse"
  | "g"
  | "line"
  | "path"
  | "polygon"
  | "polyline"
  | "rect";
type IconNode = [elementName: IconNodeElements, attrs: Attrs][];
```

```ts
// From tests/testIconNodes.ts
export const airVent: IconNode = [
  ["path", { d: "M6 12H4a2 2 0 0 1-2-2V5..." }],
  ["path", { d: "M6 8h12" }],
  // ...
];
```

Render an arbitrary node set with the bare `Icon`:

```svelte
<script>
  import { Icon } from '@lucide/svelte';
  import { airVent } from './my-nodes';
</script>
<Icon iconNode={airVent} size={48} color="red" />
```

---

## Default SVG attributes

Applied first; user props override.

```ts
{
  xmlns: 'http://www.w3.org/2000/svg',
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 2,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
}
```

Emitted classes (always): `lucide-icon lucide`. Plus `lucide-${name}` if `name`
set. Plus user-provided `class`. Plus global `class` from context.

---

## Recipes

### Icon in a button

```svelte
<script>
  import { Plus } from '@lucide/svelte';
</script>
<button aria-label="Add item">
  <Plus size={16} aria-hidden="true" />
  Add
</button>
```

### Themed icons with CSS

```svelte
<!-- stroke follows `color: ...` via default `currentColor` -->
<style>.primary { color: oklch(0.7 0.2 250); }</style>
<span class="primary"><Heart /></span>
```

### Scaled strokes that stay visually consistent

```svelte
<!-- keeps stroke ~2px regardless of rendered size -->
<Smile size={48} strokeWidth={2} absoluteStrokeWidth />
```

### Custom class + extra svg attrs

```svelte
<Smile class="my-icon" style="position: absolute" data-testid="smile-icon" />
<!-- → class="lucide-icon lucide lucide-smile my-icon" style="position: absolute" data-testid="smile-icon" -->
```

### Accessible icon with label

```svelte
<Smile aria-label="User is happy" />
<!-- OR -->
<Smile><title>User is happy</title></Smile>
```

### Render by dynamic name

```svelte
<script lang="ts">
  import { icons, type LucideIcon } from '@lucide/svelte';
  let { iconName }: { iconName: keyof typeof icons } = $props();
  const Cmp = $derived(icons[iconName] as LucideIcon);
</script>
<Cmp size={20} />
```

### Set app-wide defaults

```svelte
<!-- +layout.svelte -->
<script>
  import { setLucideProps } from '@lucide/svelte';
  setLucideProps({ size: 20, strokeWidth: 1.5 });
</script>
{@render children()}
```

### Tree-shaken single import

```svelte
<script>
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
</script>
<ArrowRight />
```

### Render a custom icon with the bare `Icon`

```svelte
<script>
  import { Icon, type IconNode } from '@lucide/svelte';
  const myIcon: IconNode = [['circle', { cx: 12, cy: 12, r: 10 }]];
</script>
<Icon iconNode={myIcon} name="my-custom" size={32} />
```

### Alias usage

```svelte
<script>
  import { Pen, Edit2 } from '@lucide/svelte'; // identical rendered output
</script>
```

---

## Gotchas

- **`absoluteStrokeWidth` rescale formula**:
  `stroke-width = strokeWidth * 24 / size`. At
  `size=48 strokeWidth=2 absoluteStrokeWidth` you get `stroke-width="1"`. Feels
  counterintuitive — the rescale _preserves apparent thickness_ as size grows.
- **Auto `aria-hidden` can surprise**: an icon with no label gets
  `aria-hidden="true"` automatically. If you need it announced, pass
  `aria-label`, `title`, or slot a `<title>` child. Setting
  `aria-hidden="false"` explicitly works too.
- **Tree-shaking**: prefer named imports (`import { X } from '@lucide/svelte'`)
  — the package has `"sideEffects": false`, so bundlers drop unused icons. A
  bulk default import is **not** supported (no default export from root).
- **Kebab vs Pascal names**: import paths are kebab-case (`arrow-big-down`),
  component names are PascalCase (`ArrowBigDown`). The conversion is
  `split('-').map(capitalize).join('')`.
- **`iconNode` tag whitelist**: only
  `circle | ellipse | g | line | path | polygon | polyline | rect`. Anything
  else fails the type check. (`Attrs` otherwise accepts any SVG attribute.)
- **Class composition order**: final class string is
  `lucide-icon lucide lucide-${name} ${globalCtx.class} ${props.class}`. Later
  entries (yours) override earlier ones under Tailwind/standard CSS cascading,
  but be mindful if you rely on `lucide-*` being last.
- **`name` prop is already set** on generated icons. If you pass `name`
  explicitly, you override the `lucide-${name}` class — usually not what you
  want.
- **`fill="none"` by default**: lucide icons are stroke-only outlines. Setting
  `fill` on the svg will usually ruin the icon.
- **Package name is scoped**: `@lucide/svelte`, not `lucide-svelte`. The
  unscoped name is a different (legacy) package with a different runtime.

---

## Cheat sheet

```svelte
<!-- Imports -->
<script>
  import { Smile, Icon } from '@lucide/svelte';          // named
  import Smile from '@lucide/svelte/icons/smile';        // tree-shaken
  import { setLucideProps } from '@lucide/svelte';       // global defaults
  import type { LucideProps, IconNode, LucideIcon } from '@lucide/svelte';
</script>

<!-- Usage -->
<Smile />                                                <!-- 24px, currentColor, sw=2 -->
<Smile size={32} color="red" strokeWidth={1.5} />
<Smile size={48} strokeWidth={2} absoluteStrokeWidth />  <!-- visually 2px -->
<Smile class="h-5 w-5" style="display: inline" />
<Smile aria-label="happy" />                             <!-- no aria-hidden -->
<Smile><title>happy</title></Smile>                      <!-- no aria-hidden -->
<Icon iconNode={customNodes} name="mine" />              <!-- generic -->

<!-- Context -->
<script>setLucideProps({ size: 20, strokeWidth: 1.5 });</script>
```

| Question              | Answer                                            |
| --------------------- | ------------------------------------------------- |
| Package               | `@lucide/svelte`                                  |
| Default size          | `24`                                              |
| Default color         | `currentColor` (inherits CSS `color`)             |
| Default strokeWidth   | `2`                                               |
| Classes emitted       | `lucide-icon lucide lucide-${name} ${user.class}` |
| Accessibility default | `aria-hidden="true"` if no label                  |
| How to label          | `aria-label="..."` or `<title>...</title>` slot   |
| Total icons           | 1694 (kebab-case → PascalCase)                    |
| Tree-shakable         | Yes (`sideEffects: false`)                        |

---

## Appendix A — Icon names

> Placeholder — user will paste the full list here.
>
> Format: one kebab-case name per line, directly from `/icons/*.json`. Component
> name = PascalCase of the kebab name (e.g. `a-arrow-down` → `AArrowDown`).
> Import paths:
>
> - Named: `import { AArrowDown } from '@lucide/svelte'`
> - Tree-shaken: `import AArrowDown from '@lucide/svelte/icons/a-arrow-down'`

```
# paste the 1694 icon names here, one per line
# a-arrow-down
# a-arrow-up
# a-large-small
# accessibility
# activity
# ...
# zoom-in
# zoom-out
```

### Known alias pairs (verified in tests)

| Alias | Canonical |
| ----- | --------- |
| `Pen` | `Edit2`   |

Full alias list is generated by `build-icons --withAliases` into
`./aliases/{aliases,prefixed,suffixed}.ts` at package build time. To discover
aliases at runtime, inspect the `./aliases/index.js` export.
