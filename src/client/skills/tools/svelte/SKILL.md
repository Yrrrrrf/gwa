---
name: svelte-5
description: >-
  Use this skill when writing, reading, or debugging Svelte 5 (5.56+) code: .svelte
  components, .svelte.js/.svelte.ts reactive modules, runes ($state/$derived/$effect/
  $props/$bindable/$inspect/$host), or template syntax (snippets, {#await}, {@attach}).
  Covers 8 runes, 20+ template constructs across 2 files, 7 special elements, props/
  context/lifecycle/stores/TypeScript typing. Reach for this when building or
  refactoring a .svelte component, typing props/snippets/components in TypeScript,
  wiring context/lifecycle/stores, or hitting runtime symptoms like
  "ownership_invalid_mutation", "state_unsafe_mutation", "effect_update_depth_exceeded",
  "await_waterfall", or stale-looking derived values. Assumes current Svelte 5 syntax
  only — no Svelte 3/4 comparisons or migration content. Not for SvelteKit
  routing/load/server internals (separate doc set).
metadata:
  package: svelte
  version: "5.56 (verified against 5.56.8 on npm; API stable across 5.x runes mode, individual runes/features gated by @since version noted inline)"
  verified: 2026-08-09
  source_of_truth: official docs (svelte.dev/docs/svelte + per-page /llms.txt), npm registry
  upstream: https://svelte.dev/docs/svelte/llms.txt
---

# Svelte 5

> [!abstract] Purpose
> Svelte 5 core: runes-based reactivity, the .svelte file format, and how they compose
> into a minimal component. This is the always-loaded facet — reactivity is the thing
> every other facet (template syntax, props/context/lifecycle) sits on top of.

## 📥 Inputs

- **Context:** a Svelte 5.x project (`.svelte`, `.svelte.js`, `.svelte.ts` files),
  compiled by the Svelte compiler — usually via SvelteKit or `vite-plugin-svelte`.
- **Constraints:** a file is in **runes mode** as soon as a rune is used in it (or via
  `<svelte:options runes={true} />`). Modern browser required (`Proxy`,
  `ResizeObserver`) — no IE.
- **Anti-use:** not for SvelteKit routing, `load` functions, server (`+page.server.js`),
  `$app/*` modules, or remote functions — that's a separate framework/doc set
  (`svelte.dev/docs/kit`). Not for upgrading Svelte 3/4 code or explaining legacy
  syntax — this skill only teaches current 5.56+ syntax.

## 📤 Outputs

- **Result:** correct, current (5.56+) `.svelte` component code or `.svelte.ts`
  reactive-module code.
- **Side Effects:** none — this is reference material, not a code-generation pipeline.

## ⛓️ Workflow

```svelte
<!--- file: Counter.svelte --->
<script>
	let { start = 0, step = $bindable(1) } = $props();

	let count = $state(start);
	let doubled = $derived(count * 2);

	$effect(() => {
		console.log(`count is now ${count}`);
	});
</script>

<button onclick={() => (count += step)}>
	{count} (doubled: {doubled})
</button>
```

This is the whole mental model: `$state` is a mutable reactive value (no `.value`),
`$derived` is a pure computation over reactive values, `$effect` is the DOM/IO escape
hatch, `$props` destructures inputs, `$bindable` opts a prop into two-way flow. Template
syntax (`{#if}`, `{#each}`, events, `bind:`, snippets, ...) composes around this — see
[template-syntax.md](template-syntax.md).

## 🧭 Reference map

| File | Load when |
|---|---|
| This file | always — reactivity core |
| [template-syntax.md](template-syntax.md) | writing/debugging control flow, snippets, events, `bind:`, `use:`, transitions/animations, `{@attach}`, style/class, special elements |
| [component-api.md](component-api.md) | typing `$props`, context, lifecycle hooks, stores interop, TS component types, imperative `mount`/`unmount` |

## 📋 Core invariants

Violate these and you get plausible-looking but silently wrong (or infinite-looping)
output, not a compiler error.

```js
// 1. reactive values are read DIRECTLY — no .value/.get(): $state, $derived,
//    destructured $props are just the value.
// 2. $state(arr|obj) deep-proxies plain arrays/objects (.push() etc tracked).
//    $state.raw(...) opts out: only REASSIGNMENT tracked, not mutation.
//    class instances are NEVER auto-proxied — mark fields individually: `x = $state(0)`.
// 3. $derived expressions must be pure (compiler forbids writes inside them).
//    $effect must not write $state it also reads in the same run (-> infinite loop);
//    reach for $derived/$derived.by instead 90% of the time.
// 4. $effect/$derived dependency tracking is RUNTIME, based on what was read
//    SYNCHRONOUSLY the last time it ran.
//    state read after `await` or inside setTimeout/callbacks is NOT tracked.
// 5. props flow one-way. reassigning a prop = fine, temporary local override.
//    mutating a prop's proxied properties only "works" if the parent owns a $state
//    proxy there, and warns (ownership_invalid_mutation) — use $bindable() for real
//    two-way flow.
// 6. a rune is a compiler KEYWORD, not a JS value/import — can't be reassigned,
//    stored, or passed as an argument; valid only at the top level of a component/
//    function inside .svelte/.svelte.js/.svelte.ts, or nested in another rune's callback.
// 7. effects run in a MICROTASK AFTER the DOM update, batched — two $state writes in
//    the same tick = one effect run. $effect.pre runs BEFORE the DOM update instead
//    (replaces beforeUpdate).
```

## ⚠️ Gotchas — Reactivity

| ❌ Symptom / verbatim error | Cause | ✅ Fix |
|---|---|---|
| `let doubled = count * 2;` never updates | script runs once at creation; without a rune, `doubled` is a frozen plain value | `let doubled = $derived(count * 2);` |
| `effect_update_depth_exceeded` — *"Maximum update depth exceeded. This typically indicates that an effect reads and writes the same piece of state."* | `$effect(() => { count += 1; })` both reads and writes `count` | use `$derived` instead, or move the write to an event handler / `untrack()` the offending read |
| `state_unsafe_mutation` — *"Updating state inside a derived or a template expression is forbidden."* | assigning to `$state` inside a `$derived(...)` body, a `{expression}`, or an `{#if cond}` test | do the write in an event handler or `$effect`, never inline in a derivation/template |
| `ownership_invalid_mutation` (warning) | a child mutates a property of an object **prop** it doesn't own (parent passed a `$state` proxy without `$bindable`) | mark the prop `$bindable()` in the child + `bind:` from the parent, or use a callback prop |
| `$effect` fires once, then never again on a mutated object | effect re-runs when the *object reference* it read changes, not a property *inside* it, unless that property was itself read synchronously | read `state.value` (the property) inside the effect body, not just `state`; confirm with `$inspect` |
| `let { done } = todos[0]; todos[0].done = true;` — `done` stays stale | destructuring a `$state` proxy is plain JS destructuring, evaluated once | keep referencing `todos[0].done`, or destructure a `$derived(...)` instead (stays reactive per-field) |
| `new Foo()` then `foo.value = 1` does nothing in the UI | class instances are never auto-proxied — only individually-marked fields are reactive | declare the field inline: `class Foo { value = $state(0); }` |
| `export const count = $state(0); export function inc(){ count += 1 }` — importers see `typeof count === 'object'`, never updates for them | compiler only rewrites `$state` refs *within the declaring file*; a re-exported reassigned binding isn't transformed at the import site | export a `$state`-wrapped object and mutate its property, or export getter functions instead of the raw binding |

## 📝 Cheat sheet

```js
// --- $state ---------------------------------------------------------------
let x    = $state(initial);        // deep-reactive if plain array/object
let raw  = $state.raw(initial);    // reassign-only, no deep proxy (perf)
$state.snapshot(x);                // static clone, e.g. for structuredClone/3rd-party
$state.eager(x);                   // read synchronously ahead of await-batched updates

// classes: mark fields individually, not the instance
class Todo {
	done = $state(false);
	constructor(text) { this.text = $state(text); }
}

// --- $derived ---------------------------------------------------------------
let y = $derived(expr);                    // pure; reassignable since 5.25 (optimistic UI)
let y = $derived.by(() => { /* ... */ return v; });

// --- $effect ---------------------------------------------------------------
$effect(() => {
	/* runs after mount, after each dep change (microtask, batched, DOM already updated) */
	return () => { /* teardown: before re-run, and on unmount */ };
});
$effect.pre(() => { /* like $effect but BEFORE DOM update */ });
$effect.tracking();   // bool — are we inside a tracking context right now?
$effect.pending();    // count of pending `await` in the current <svelte:boundary>
$effect.root(() => {  // untracked scope, manual cleanup, usable outside component init
	$effect(() => { /* ... */ });
	return () => { /* teardown */ };
});

// --- $props / $bindable ---------------------------------------------------------------
let { a, b = 1, c: renamed, ...rest } = $props();
let { value = $bindable() } = $props();        // opt-in two-way; child MAY bind: to it
let { value = $bindable('fallback') } = $props();
const uid = $props.id();                       // stable, SSR-consistent id (5.20+)

// --- $inspect (dev-only, no-op in prod) ---------------------------------------------------------------
$inspect(a, b);                                 // console.log on any change, deep
$inspect(a).with((type, a) => { /* 'init'|'update' */ });
$inspect.trace('label');                        // first stmt in fn; traces re-run cause (5.14+)

// --- $host (inside <svelte:options customElement="tag-name" />) ---------------------------------------------------------------
$host().dispatchEvent(new CustomEvent('type'));
```

## Connections

- Sibling facets in this same skill: [template-syntax.md](template-syntax.md),
  [component-api.md](component-api.md).
- SvelteKit (routing/load/server/`$app/*`) is covered in [[lang/ts/sveltekit/SKILL.md|sveltekit-3]].

## 🔄 Provenance

- **Source:** `svelte.dev/docs/svelte` (overview, runes pages, `llms.txt`), npm registry
  (`svelte@5.56.8`, checked 2026-08-09), GitHub issues used only to confirm verbatim
  runtime error/warning text.
- **Not covered / unverified here:** Svelte 3/4 legacy syntax and migration (dropped by
  design — this skill teaches current syntax only), SvelteKit (routing, load, server,
  remote functions — SvelteKit 3 is in `@next` prerelease as of this writing),
  `svelte/motion` (`tweened`/`spring`), full `svelte/reactivity` export list beyond the
  built-ins mentioned in component-api.md, compiler-plugin/preprocessor internals,
  custom-elements deep dive, Vitest/testing setup. The `<svelte:window>`/
  `<svelte:document>`/`<svelte:body>` binding lists in template-syntax.md are stable,
  long-standing APIs — their existence/names were confirmed against the current docs
  nav, but the exact per-element binding lists were carried from general knowledge, not
  re-fetched line-by-line this pass; spot-check against
  `svelte.dev/docs/svelte/svelte-window` etc. before relying on an obscure one.
- **Refresh:** re-fetch `https://svelte.dev/docs/svelte/llms.txt`, diff against the
  Phase-5 checklist in `derive`, check `npm view svelte version` for drift, bump
  `verified`.
