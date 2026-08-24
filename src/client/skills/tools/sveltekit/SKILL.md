---
name: sveltekit-3
description: >-
  Use this skill when writing, reading, building, or debugging SvelteKit 3 (@sveltejs/kit
  3.0+, Svelte 5) applications. Covers filesystem routing (+page, +layout, +server, +error),
  universal vs server load functions, $types (PageProps, LayoutProps, RouteParams), $app/state
  runes (page, navigating, updated), remote functions (.remote.ts: query, form, command),
  server hooks/middleware, cookie v2 handling, parameter matchers via defineParams, and Vite-based
  configuration in vite.config.ts (svelte.config.js removed). Reach for this when building
  SvelteKit pages/layouts/endpoints, implementing data loading or server actions, configuring
  adapters/deployment, or diagnosing symptoms like "$app/stores not found", "page.url is readonly",
  "goto rejects invalid route", "cannot read event.url inside query", or "svelte.config.js is no longer supported".
metadata:
  package: "@sveltejs/kit"
  version: "3.0 (verified against @sveltejs/kit 3.0-rc/next; requires Svelte 5.56+, Vite 8, Node 22.17+, TS 6+)"
  verified: 2026-08-20
  source_of_truth: official docs (next.svelte.dev/docs/kit + llms.txt + migrating-to-sveltekit-3), npm registry
  upstream: https://next.svelte.dev/docs/kit/llms.txt
---

# SvelteKit 3

> [!abstract] Purpose
> SvelteKit 3 application framework: filesystem routing, data loading (`load`), Svelte 5 runes-based framework state (`$app/state`), server endpoints, and application lifecycle. This is the master entry file — it establishes the core mental model and routing architecture that every other facet (remote functions, server hooks, client navigation, configuration & adapters) builds upon.

## 📥 Inputs

- **Context:** A SvelteKit 3.x project running on Node 22.17+, Vite 8 (Rolldown), TypeScript 6+, and Svelte 5.56+ (runes mode). Configuration is declared directly in `vite.config.ts` via the `sveltekit()` plugin.
- **Constraints:** SvelteKit 3 requires Svelte 5 runes mode. The `$app/stores` module and `svelte.config.js` are completely removed. Subpath imports (`#lib/*`) replace `$lib`.
- **Anti-use:** Not for standalone client-only Svelte 5 components without a SvelteKit router (use [[lang/ts/svelte/SKILL.md|svelte-5]]). Not for SvelteKit 1.x or 2.x legacy syntax (`$app/stores`, `pushState`, `handleValidationError`, `svelte.config.js` kit config).

## 📤 Outputs

- **Result:** Complete, idiomatic SvelteKit 3 route files (`+page.svelte`, `+page.ts`, `+page.server.ts`, `+layout.svelte`, `+server.ts`, `+error.svelte`), remote modules (`*.remote.ts`), hooks, and Vite configurations.
- **Side Effects:** Server-rendered HTML, client-side hydration, generated routing manifests in `.svelte-kit/`, and adapter-specific server builds.

## ⛓️ Workflow

```svelte
<!--- src/routes/blog/[slug]/+page.svelte --->
<script lang="ts">
	import type { PageProps } from './$types';
	import { page } from '$app/state';

	let { data, params }: PageProps = $props();
</script>

<h1>{data.post.title}</h1>
<p class="meta">Route: {page.route.id} | Slug: {params.slug}</p>
<article>{@html data.post.content}</article>
```

```ts
// src/routes/blog/[slug]/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import * as db from '#lib/server/db';

export const load: PageServerLoad = async ({ params, locals }) => {
	const post = await db.getPostBySlug(params.slug);
	if (!post) {
		error(404, 'Post not found');
	}
	return { post };
};
```

This is the core model: routes are directories in `src/routes`; data flows down from `+page.server.ts`/`+page.ts` `load()` into `+page.svelte` via `$props()`; global context and metadata are inspected reactively via `$app/state` (`page`, `navigating`, `updated`); shared utilities are imported via `#lib/*`.

## 🧭 Reference map

| File | Load when |
|---|---|
| This file | always — routing core, `load`, `$types`, `$app/state`, and file conventions |
| [remote-functions.md](remote-functions.md) | writing or consuming `.remote.ts` modules (`query`, `query.batch`, `query.live`, `form`, `command`, `prerender`), single-flight mutations, field schemas (`.as()`), and `getRequestEvent()` |
| [server-hooks-and-endpoints.md](server-hooks-and-endpoints.md) | writing `+server.ts` endpoints, server/client hooks (`handle`, `handleFetch`, `handleError`, `reroute`, `transport`), cookie v2 APIs, OpenTelemetry instrumentation, and server-only modules |
| [navigation-and-routing.md](navigation-and-routing.md) | client navigation (`goto`, `refreshAll`, `invalidate`), shallow routing modals, path helpers (`asset()`, `resolve()`, `match()`), param matchers (`defineParams`), link options, and `$app/env` |
| [config-and-adapters.md](config-and-adapters.md) | configuring `vite.config.ts` (`sveltekit()`), `#lib` subpath imports, `$app/tsconfig`, adapters (`adapter-auto`, `adapter-node`, `adapter-static`, `adapter-cloudflare`, `adapter-vercel`), and v2→v3 migration |

## 📋 Core invariants

Violate these and you get silent runtime failures, broken hydration, or type errors.

```ts
// 1. $app/stores IS REMOVED: import { page, navigating, updated } from '$app/state'.
//    Read without '$' (page.url.pathname, not $page.url.pathname).
// 2. page.url is ReadonlyURL: mutating searchParams directly (page.url.searchParams.set())
//    is forbidden. Clone via new URL(page.url) before modifying.
// 3. $lib is replaced by Node subpath imports #lib declared in package.json "imports".
// 4. svelte.config.js is REMOVED: all kit configuration lives in vite.config.ts under
//    plugins: [sveltekit({ ... })].
// 5. PageProps & LayoutProps type both `data` AND `params` (and `form` / `children`).
//    Components are typed via let { data, params }: PageProps = $props().
// 6. Universal load (+page.ts) runs on server during SSR AND in browser during navigation.
//    Server load (+page.server.ts) ONLY runs on server (can access server-only modules).
// 7. Data returned from server load must be serializable by `devalue` (JSON, Date, Map,
//    Set, RegExp, BigInt, custom transport types).
// 8. error(status, message, extraProps?) requires a STRING message as 2nd argument.
//    Additional properties (e.g. tracking code) must be passed in the 3rd argument object.
// 9. redirect(status, location, { external?: true }) throws a Redirect symbol — never
//    catch it in a generic try/catch block without re-throwing. External URLs require { external: true }.
// 10. Links to the current URL trigger refreshAll() automatically in SvelteKit 3.
```

## ⚠️ Gotchas

| ❌ Symptom / verbatim error | Cause | ✅ Fix |
|---|---|---|
| `Cannot find module '$app/stores'` | `$app/stores` removed in SvelteKit 3 | Import from `$app/state`: `import { page } from '$app/state';` and use `page.url` (no `$`) |
| `Cannot assign to read only property 'pathname' of object` / `Cannot modify ReadonlyURLSearchParams` | Direct mutation of `page.url` in `$app/state` | Clone first: `const url = new URL(page.url); url.searchParams.set('q', val); goto(url);` |
| `Invalid configuration file: svelte.config.js is no longer supported` | SvelteKit 3 config moved to Vite | Move all `config.kit.*` options to `sveltekit({ ... })` inside `vite.config.ts` and delete `svelte.config.js` |
| `Cannot find module '$lib/...'` | `$lib` alias is no longer generated | Add `"imports": { "#lib/*": "./src/lib/*" }` to `package.json` and import from `#lib/...` |
| `goto(...)` Promise rejects on unmapped URL | SvelteKit 3 `goto` rejects when navigating to a URL that does not match any route | Catch error or ensure target route exists; use external navigation (`window.location.href`) for external links |
| `Invalid argument: error message must be a string` | Passing an object directly as 2nd arg to `error()` (`error(400, { code: 'BAD' })`) | Pass string 2nd, object 3rd: `error(400, 'Bad Request', { code: 'BAD' })` |
| Form action redirects to external URL fail with error | SvelteKit 3 blocks external redirects by default for security | Pass `{ external: true }` or allowlist: `redirect(303, 'https://auth.com', { external: true })` |
| `handleError` not invoked on expected `error()` calls | Misunderstanding SvelteKit 2 behavior | SvelteKit 3 routes ALL errors (expected and unexpected) through `handleError` |

## 📝 Cheat sheet

```ts
// --- Routing & Component Props --------------------------------------------
// +page.svelte
let { data, params }: PageProps = $props();

// +layout.svelte
let { data, children }: LayoutProps = $props();
// {@render children()}

// +error.svelte
import { page } from '$app/state';
// <h1>{page.status}: {page.error?.message}</h1>

// --- Load Functions --------------------------------------------------------
// +page.server.ts (Server-only)
export const load: PageServerLoad = async ({ params, fetch, cookies, locals, depends }) => {
	depends('app:posts');
	return { items: await fetch('/api/items').then(r => r.json()) };
};

// +page.ts (Universal: SSR + Client)
export const load: PageLoad = async ({ data, fetch, params }) => {
	return { ...data, clientExtra: 'value' };
};

// --- Form Actions (+page.server.ts) ---------------------------------------
export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const title = form.get('title')?.toString();
		if (!title) return fail(400, { title, missing: true });
		return { success: true };
	}
};

// --- Reactive State ($app/state) -------------------------------------------
import { page, navigating, updated } from '$app/state';

const currentPath = $derived(page.url.pathname);
const routeParam  = $derived(page.params.slug);
const isPending   = $derived(navigating.to !== null);
const hasUpdate   = $derived(updated.current);
```

## Connections

- Sibling facets in this skill:
  - [remote-functions.md](remote-functions.md) — Server functions, RPC queries, type-safe forms, live streams
  - [server-hooks-and-endpoints.md](server-hooks-and-endpoints.md) — Request handling, cookies v2, hooks, middleware
  - [navigation-and-routing.md](navigation-and-routing.md) — Client navigation, shallow routing, paths, param matchers
  - [config-and-adapters.md](config-and-adapters.md) — Vite config, adapters, build, and migration
- Complements [[lang/ts/svelte/SKILL.md|svelte-5]] (runes reactivity, template syntax, component lifecycle).
- Connects to [[ai-skills|AI Skills Index]].

## 🔄 Provenance

- **Source:** Official SvelteKit documentation (`next.svelte.dev/docs/kit`), `llms.txt`, and `migrating-to-sveltekit-3` migration guide.
- **Version pin:** `@sveltejs/kit` 3.0 (verified against 3.0-rc / next line on npm, August 2026; requires Svelte 5.56+, Vite 8, Node 22.17+, TypeScript 6+).
- **Refresh:** Check `https://next.svelte.dev/docs/kit/llms.txt` and `https://next.svelte.dev/docs/kit/migrating-to-sveltekit-3`, run `npx sv@next migrate sveltekit-3` diffs, and bump `metadata.verified`.
