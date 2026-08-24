# Template Syntax & Directives

> [!abstract] Purpose
> Everything that lives in the markup section of a `.svelte` file: control-flow blocks,
> snippets/render tags, events, `bind:`, `use:`, transitions/animations, `{@attach}`,
> `style:`/`class`, and the special `<svelte:*>` elements.

## ⚡ Control flow blocks

| Block | Forms |
|---|---|
| `{#if}` | `{#if x}...{:else if y}...{:else}...{/if}` |
| `{#each}` | `{#each list as item, i (key)}...{:else}...{/each}` — `key` enables keyed diffing (reorder-aware); omit `as item` (`{#each { length: 8 }, i}`) to just repeat N times; destructuring/rest allowed: `{#each items as { id, ...rest }, i (id)}` |
| `{#key}` | `{#key expr}...{/key}` — destroys+recreates contents (and replays transitions) when `expr` changes |
| `{#await}` | `{#await p}pending{:then v}ok{:catch e}err{/await}` — `then`/`catch`-only and inline (`{#await p then v}`) forms allowed; catch block optional; SSR renders only the pending branch (or `then` immediately if `p` isn't a Promise) |
| `{#snippet}` | `{#snippet name(param1, param2 = default)}...{/snippet}` — no rest params |

```svelte
{#each items as item, i (item.id)}
	<li>{i + 1}: {item.name}</li>
{:else}
	<p>No items</p>
{/each}

{#await fetchUser(id)}
	<p>loading…</p>
{:then user}
	<p>{user.name}</p>
{:catch error}
	<p>failed: {error.message}</p>
{/await}
```

## ⚡ Snippets & render

```svelte
{#snippet row(item)}
	<td>{item.name}</td>
{/snippet}

{@render row(item)}
{@render children?.()}                 <!-- optional-chain a snippet that might not exist -->
{@render (cool ? a : b)()}             <!-- render can be an arbitrary expression -->
```

- Snippets are lexically scoped: visible to siblings and their children, not to parents
  or across sibling snippet boundaries.
- Snippets declared **directly inside** a component tag become implicit props on it;
  non-snippet content becomes the implicit `children` prop — render it with
  `{@render children()}`.
- You cannot have a prop literally named `children` if the component also receives
  slotted content — it's reserved.
- Exportable from `<script module>` since 5.5.0, as long as they don't reference the
  non-module `<script>` scope.
- Type with `Snippet`/`Snippet<[Arg1, Arg2]>` imported from `'svelte'` (tuple = params).

```svelte
<Table data={fruits}>
	{#snippet header()}<th>fruit</th>{/snippet}
	{#snippet row(d)}<td>{d.name}</td>{/snippet}
</Table>
```

## ⚡ Events

```svelte
<button onclick={() => count++}>click</button>     <!-- just a property, like any other -->
<button {onclick}>click</button>                    <!-- shorthand -->
<button {...spread}>click</button>                  <!-- spread; local handlers go AFTER spread -->
<button onclickcapture={fn}>click</button>          <!-- capture phase (only non-wrapper-able modifier) -->
```

- `onclick`/`onClick` are **case-sensitive**, distinct event names — this is how you can
  listen for uppercase custom events.
- Multiple handlers for one event on one element are **not allowed** (duplicate
  attribute) — merge them into one function: `onclick={(e) => { one(e); two(e); }}`.
- No `|once|preventDefault|stopPropagation` modifiers on event attributes (those were
  `on:` syntax only) — wrap the handler yourself, or call `event.preventDefault()`
  inside it. `capture`/`passive`/`nonpassive` can't be wrapper functions; use
  `onclickcapture` for capture, or `on` from `svelte/events` inside an action for
  passive control.
- `ontouchstart`/`ontouchmove` are passive by default (browser-default-aligned).
- **Delegated** events (single root listener, for perf) — don't call `stopPropagation`
  on these via raw `addEventListener`, and mind ordering vs. manually-added root
  listeners: `beforeinput click change dblclick contextmenu focusin focusout input
  keydown keyup mousedown mousemove mouseout mouseover mouseup pointerdown pointermove
  pointerout pointerover pointerup touchend touchmove touchstart`.
- Transition events (fire alongside the above): `introstart introend outrostart
  outroend`.

## ⚡ bind:

`bind:prop={expr}` → `bind:prop` shorthand when names match. Data flows child → parent.

| Target | Bindings |
|---|---|
| `<input>` text/number/range | `bind:value` (numeric coercion for `number`/`range`; `undefined` if empty/invalid) |
| `<input type=checkbox>` | `bind:checked`, `bind:indeterminate` |
| `<input type=radio/checkbox>` group | `bind:group` (radio → scalar, checkbox → array); same-component only |
| `<input type=file>` | `bind:files` (a `FileList`; must be `null`/`undefined`/`FileList` to set) |
| `<select>` | `bind:value` (any value type, not just strings); `multiple` → array |
| `<audio>`/`<video>` | 2-way: `currentTime playbackRate paused volume muted`; readonly: `duration buffered seekable seeking ended readyState played` (+`videoWidth/videoHeight` for video) |
| `<img>` | readonly: `naturalWidth naturalHeight` |
| `<details>` | `bind:open` |
| `contenteditable` | `bind:innerHTML` / `bind:innerText` / `bind:textContent` |
| any visible element | readonly dimensions via `ResizeObserver`: `clientWidth clientHeight offsetWidth offsetHeight contentRect contentBoxSize borderBoxSize devicePixelContentBoxSize` (inline elements have none) |
| any element/component | `bind:this={ref}` — `undefined` until mounted; read inside `$effect`/handlers, not during init |
| component prop | `bind:propName` — only works if that prop is declared `$bindable()` in the child |

```svelte
<!-- function bindings (5.9+): validate/transform on the way in -->
<input bind:value={() => value, (v) => value = v.toLowerCase()} />
<div bind:clientWidth={null, redraw}>...</div>   <!-- readonly binding: getter must be null -->
```

- Since 5.6.0, `<input>`/`<select>` respect `defaultValue`/`defaultChecked`/`selected`
  on form `reset`, but the live binding value wins on *initial* render unless it's
  `null`/`undefined`.
- Since Svelte 5, bindings react to native form `reset` events (a `reset` listener is
  attached to `document`).

## ⚡ use: (actions) vs {@attach} (attachments)

```svelte
<!-- action: mounted once, argument changes do NOT re-run it -->
<div use:myaction={data}>...</div>
function myaction(node, data) {
	$effect(() => { /* setup */ return () => { /* teardown */ }; });
}

<!-- attachment (5.29+): reactive — re-runs on {@attach expr}'s own deps changing -->
<div {@attach myAttachment}>...</div>
<div {@attach enabled && myAttachment}>...</div>   <!-- falsy = no-op, so this is conditional -->
<canvas {@attach (node) => { const ctx = node.getContext('2d'); return () => cleanup(); }}></canvas>
function tooltip(content) {                         // attachment FACTORY pattern
	return (node) => { const t = tippy(node, { content }); return t.destroy; };
}
```

- Prefer `{@attach}` over `use:` in new code (more flexible/composable); `use:` remains
  for existing action libraries — convert with `fromAction` from `svelte/attachments`.
- `{@attach}` on a **component** creates a Symbol-keyed prop; only takes effect if the
  component spreads `...props` onto a real element (lets you build wrapper components).
- Attachments re-run whenever *any* state read inside them changes (including args
  passed in) — to avoid expensive re-setup, pass a getter and read it inside a nested
  `$effect` instead of directly in the attachment body.

## ⚡ transition: / in: / out: / animate:

```svelte
import { fade, fly } from 'svelte/transition';
{#if visible}
	<div transition:fade={{ duration: 200 }}>both ways</div>
	<div in:fly={{ y: 200 }} out:fade>in ≠ out, and in: doesn't reverse</div>
{/if}

{#each list as item (item.id)}
	<li animate:flip>{item}</li>       <!-- only fires on REORDER of a keyed each -->
{/each}
```

- `transition:` is **bidirectional** (reverses smoothly if interrupted); `in:`/`out:`
  are independent — an interrupted `out:` restarts from scratch rather than reversing.
- Transitions are **local** by default (only play when their own block is
  created/destroyed) — add `|global` to also play when an ancestor block toggles:
  `transition:fade|global`.
- Custom transition/animation functions return `{ delay, duration, easing, css(t, u),
  tick(t, u) }` — prefer `css` over `tick` (runs off main thread). `t`: 0→1 easing
  progress (in) or 1→0 (out); `u` = `1 - t`. Animation functions additionally receive
  `{ from: DOMRect, to: DOMRect }`.
- `animate:` must be on an element that's an **immediate child** of a keyed `{#each}`,
  and only fires when an existing item's *index* changes (not on add/remove).

## ⚡ style: / class

```svelte
<div style:color style:width="12rem" style:--custom={val} style:color|important="red">...</div>

<!-- object/array form, via clsx -->
<div class={{ cool, lame: !cool }}>...</div>
<div class={[faded && 'opacity-50', large && 'scale-200']}>...</div>
<div class={['base', props.class]}>...</div>          <!-- merge local + forwarded classes -->
```

`style:` directives win over plain `style="..."`, even over `!important` in the plain
attribute. `ClassValue` type (from `svelte/elements`) types a prop meant to accept any
of the above class shapes.

## ⚡ Special elements

| Element | Purpose |
|---|---|
| `<svelte:boundary onerror={fn}>` | wall off a subtree: `pending` snippet shown while `await` inside is first resolving; `failed(error, reset)` snippet or `onerror(error, reset)` handles render/effect errors in the subtree (added 5.3.0; not event-handler/async errors) |
| `<svelte:window bind:scrollY .../>` | window-level bindings + `on*` listeners, no manual cleanup needed |
| `<svelte:document>` | document-level listeners/actions |
| `<svelte:body>` | body-level listeners/actions |
| `<svelte:head>...</svelte:head>` | inject into document `<head>` |
| `<svelte:element this={expr}>` | dynamic tag name — `this` must be an expression: `this={"div"}`, not `this="div"` |
| `<svelte:options .../>` | compiler directives: `customElement="tag-name"`, `runes={true|false}`, `css="injected"`, `namespace="html"\|"svg"\|"mathml"` — content inside the tag is a compiler error |

Any capitalized or dot-notation tag (`<Thing />`, `<item.Component />`) is dynamic by
default — it re-renders if the value it refers to changes.

## ⚡ await (experimental, 5.36+)

Requires `compilerOptions: { experimental: { async: true } }` in `svelte.config.js`
(flag removed in Svelte 6). Enables `await` at the top level of `<script>`, inside
`$derived(...)`, and directly in markup.

```svelte
<p>{await add(a, b)}</p>
```

- **Synchronized updates:** the UI holding an `await` expression does *not* show an
  intermediate/stale state while the new promise resolves — it waits and swaps once.
- Independent `await` expressions in markup run **concurrently**; sequential `await` in
  `<script>`/functions behaves like normal JS (sequential) — watch for the
  `await_waterfall` warning if a `$derived(await ...)` unnecessarily depends on a prior
  one finishing first.
- Errors bubble to the nearest `<svelte:boundary>`.
- `fork(...)` (5.42+, imported from `'svelte'`) lets you speculatively run `await`
  work you expect to need soon (e.g. preload on hover) and `.commit()`/`.discard()` it.
