# Props, Context, Lifecycle, Stores & TypeScript

> [!abstract] Purpose
> Component-boundary APIs: typing `$props`, `setContext`/`getContext`/`createContext`,
> the (now-tiny) lifecycle, `svelte/store` interop, TypeScript component typing, and the
> imperative `mount`/`unmount`/`hydrate` API for instantiating components by hand.

## ⚡ Lifecycle (only two real phases: create, destroy)

| API | Runs | Notes |
|---|---|---|
| `onMount(fn)` | after mount to DOM | must be called during init (can live in an external module); does **not** run during SSR; if `fn` returns a function, it runs on unmount; must be *synchronous* — `async` functions return a Promise, and the returned value won't be treated as a teardown fn |
| `onDestroy(fn)` | immediately before unmount | the only lifecycle hook that also runs on the server |
| `tick()` | — | returns a Promise that resolves after pending state changes are applied to the DOM (or next microtask if none pending) — the "after update" replacement |
| `beforeUpdate`/`afterUpdate` | **deprecated**, disallowed in runes mode | use `$effect.pre(...)` (≈ beforeUpdate) and `$effect(...)` (≈ afterUpdate) instead — these track only what they actually read, instead of firing on *every* update |

```svelte
<script>
	import { onMount, onDestroy, tick } from 'svelte';
	onMount(() => {
		const id = setInterval(tick_fn, 1000);
		return () => clearInterval(id);
	});
</script>
```

## ⚡ Context

```svelte
<!-- context.ts (co-located helper, type-safe, preferred since 5.40) -->
import { createContext } from 'svelte';
interface User { name: string }
export const [getUserContext, setUserContext] = createContext<User>();

<!-- Parent.svelte -->
setUserContext({ name: 'world' });

<!-- Child.svelte -->
const user = getUserContext();   // throws if no ancestor called set
```

- Pre-5.40 / key-based alternative: `setContext('key', value)` / `getContext('key')`
  (any JS value as key/value); also `hasContext(key)`, `getAllContexts()`.
- To share **reactive** state via context, put a `$state` object in it and mutate its
  *properties* (`counter.count += 1`), never reassign the binding itself
  (`counter = {...}`) or you "break the link" — Svelte will warn.
- Context is **request-scoped** — prefer it over a shared `.svelte.js` module-level
  `$state` object whenever the state could be mutated during SSR (module state leaks
  across requests; context doesn't).
- Component testing: since 5.49, wrap the component-under-test in a function that calls
  `setContext(...)` then `mount`s the real component, and `mount()` that wrapper.

## ⚡ Props: patterns beyond the basics

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';
	interface Props {
		requiredProperty: number;
		optionalProperty?: boolean;
		row: Snippet<[string]>;
		onSelect: (arg: string) => void;
		[key: string]: unknown;             // catch-all for forwarded attrs
	}
	let { requiredProperty, optionalProperty, row, onSelect, ...rest }: Props = $props();
</script>
```

- **Generic props:** `<script lang="ts" generics="Item extends { text: string }">` ties
  multiple prop types together (e.g. a list + a callback operating on the same `Item`).
- **Wrapper components:** type `...rest` with `HTMLButtonAttributes` (or the relevant
  `svelte/elements` interface) to forward all native attributes; fall back to
  `SvelteHTMLElements['div']` for elements without a dedicated type.
- Don't mutate a plain object prop — it either no-ops (non-reactive prop) or works with
  an `ownership_invalid_mutation` warning (reactive prop you don't own). Only
  `$bindable()` props are meant to be mutated/bound from the child.
- Fallback values (`let { x = 'default' } = $props()`) are **not** turned into reactive
  proxies, and for `$bindable` props with a fallback, the parent must pass a
  non-`undefined` value if it binds at all (prevents ambiguous shared state).

## ⚡ Stores (svelte/store) — when runes aren't enough

Runes replaced most store use cases (cross-component state, extracted logic now works
via `.svelte.js`/`.svelte.ts` files with plain `$state`). Stores remain the right tool
for: complex async streams, RxJS interop, or when you want fine-grained manual
subscribe/set/update control.

```js
import { writable, readable, derived, get, readonly } from 'svelte/store';

const count = writable(0);           // { subscribe, set, update }
const time  = readable(new Date(), (set) => {
	const id = setInterval(() => set(new Date()), 1000);
	return () => clearInterval(id);   // called when subscriber count hits 0
});
const doubled = derived(count, ($count) => $count * 2);
const ro = readonly(count);          // strips .set/.update
const val = get(count);              // one-off read (subscribe+unsubscribe under the hood — avoid in hot paths)
```

- Inside a **component**, `$store` auto-subscribes/unsubscribes and, for a writable
  store, `$store = x` calls `.set(x)` — but the store reference must be declared at the
  component's top level, not inside a block/function; plain local variables must *not*
  start with `$`.
- **Store contract** (to build your own): `.subscribe(fn)` calls `fn` **synchronously**
  with the current value, returns an unsubscribe function; optional `.set(value)` makes
  it writable. `.subscribe` may alternatively return `{ unsubscribe }` for RxJS interop.
- `svelte/reactivity` ships reactive drop-ins for built-in classes (`Set`, `Map`, `Date`,
  `URL`, ...) if you need proxy-style reactivity on those specifically, importable
  alongside runes.

## ⚡ TypeScript

```svelte
<!-- $props -->
<script lang="ts">
	let { adjective }: { adjective: string } = $props();
</script>

<!-- $state: give it an initial value, or the type includes `undefined` -->
let count: number = $state(0);
let count = $state() as number;   // "I know it'll be set before first use" escape hatch

<!-- Component type (Svelte 5 components are functions, not classes) -->
import type { Component, ComponentProps } from 'svelte';
interface Props { DynamicComponent: Component<{ prop: string }> }
const props: ComponentProps<typeof MyComponent> = { foo: 'bar' };  // extract expected props
```

- `Component<Props, Exports, Bindings>` types a component (components are functions);
  `ComponentProps<typeof MyComponent>` extracts its expected props. Type component
  events as callback props directly in `Props` — there's no separate events type.
- `verbatimModuleSyntax: true` + `isolatedModules: true` recommended in `tsconfig.json`;
  `target` at least `ES2015`. Type-only TS (interfaces, annotations) works with zero
  config; features that emit real code (enums, ctor parameter properties) need a real
  preprocessor (`vitePreprocess({ script: true })`), though most TS features work
  type-only as of Svelte 5's built-in support.
- Augment `svelte/elements` (`declare module 'svelte/elements' { ... }`, remember
  `export {}`) to add custom/experimental DOM attributes without type errors.

## ⚡ Imperative component API (mount / unmount / hydrate)

Components are **functions** — instantiate them with `mount`, not `new Component(...)`.

```js
import { mount, unmount, hydrate } from 'svelte';
import App from './App.svelte';

const app = mount(App, { target: document.body, props: { message: 'hi' } });
unmount(app, { outro: true });   // plays transitions before removal (5.13+); returns a Promise

// SSR:
import { render } from 'svelte/server';
const { head, body } = render(App, { props: { message: 'hello' } });
```

- `mount`/`hydrate` share an API; `hydrate` picks up server-rendered HTML in `target`
  and attaches to it. Neither is synchronous — `onMount` callbacks and pending-block
  content aren't guaranteed to have run/rendered the instant `mount()` returns; call
  `flushSync()` (from `'svelte'`) right after if you need that guarantee.
- The returned object has no `$on`/`$set`/`$destroy` — pass `events` in the mount
  options (discouraged — prefer callback props), use reactive `$state` objects for
  props, and call `unmount()` to tear down.
- `bind:this` on a component returns only its **exports** (`export function`/`const`
  from the component), plus accessors if `accessors: true` is set.
- `mount` plays transitions by default — pass `intro: false` to opt out.
