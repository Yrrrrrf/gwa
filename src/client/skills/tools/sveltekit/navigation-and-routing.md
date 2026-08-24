# Navigation, Shallow Routing, Paths & Matchers

> [!abstract] Purpose
> Client-side navigation engine: programatic navigation (`goto`, `refreshAll`, `invalidate`), shallow routing modals (`shallow: true`), path and asset resolution (`asset`, `resolve`, `match`), centralized parameter matchers (`defineParams`), declarative link directives, and snapshot state persistence.

## ⚡ Navigation & Routing Patterns & Reference

### 1. Client Navigation (`$app/navigation`)

```ts
// src/routes/dashboard/+page.svelte
import { goto, refreshAll, invalidate, preloadData, onNavigate } from '$app/navigation';
import { page } from '$app/state';

// 1. Programmatic navigation with options
async function navigateTo(url: string) {
	await goto(url, {
		replaceState: false, // Push or replace history entry
		noScroll: true,     // Preserve scroll position
		keepFocus: true     // Retain current focus
	});
}

// 2. Refresh data (refreshAll replaces invalidateAll in SvelteKit 3)
async function reloadData() {
	await refreshAll(); // Re-runs all load functions for active pages/layouts
}

// 3. Targeted invalidation by URL or predicate
async function invalidatePosts() {
	await invalidate('app:posts'); // Invalidate custom depends() tag
	await invalidate((url) => url.pathname.startsWith('/api/posts'));
}

// 4. View Transitions with onNavigate
onNavigate((navigation) => {
	if (!document.startViewTransition) return;
	return new Promise((resolve) => {
		document.startViewTransition(async () => {
			resolve();
			await navigation.complete;
		});
	});
});
```

### 2. Shallow Routing & Page State (`shallow: true`)

Shallow routing updates the URL and `page.state` without executing a full page navigation or re-running layout load functions (replaces deprecated `pushState`/`replaceState`).

```svelte
<!--- src/routes/gallery/+page.svelte --->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import PhotoModal from './PhotoModal.svelte';

	let { data } = $props();

	async function openPhoto(photo: { id: string; title: string; url: string }) {
		await goto(`/gallery/photo/${photo.id}`, {
			shallow: true,
			state: { selectedPhoto: photo } // Accessible via page.state
		});
	}
</script>

<div class="grid">
	{#each data.photos as photo}
		<button onclick={() => openPhoto(photo)}>
			<img src={photo.url} alt={photo.title} />
		</button>
	{/each}
</div>

{#if page.state.selectedPhoto}
	<PhotoModal photo={page.state.selectedPhoto} onclose={() => history.back()} />
{/if}
```

```ts
// src/app.d.ts - Typing page.state
declare global {
	namespace App {
		interface PageState {
			selectedPhoto?: { id: string; title: string; url: string };
		}
	}
}
export {};
```

### 3. Path Resolution (`$app/paths`)

```svelte
<!--- src/routes/+page.svelte --->
<script lang="ts">
	import { asset, resolve, match } from '$app/paths';

	// 1. Resolve static asset with configured paths.assets / base prefix
	const logoUrl = asset('brand/logo.svg');

	// 2. Resolve route IDs with parameters or pathnames with base path
	const postUrl = resolve('/blog/[slug]', { slug: 'sveltekit-3-release' });
	const settingsUrl = resolve('/settings/profile');

	// 3. Match a URL string to route ID & extracted params
	async function checkRoute(url: string) {
		const matched = await match(url);
		if (matched?.id === '/blog/[slug]') {
			console.log('Slug is:', matched.params.slug);
		}
	}
</script>

<img src={logoUrl} alt="Logo" />
<a href={postUrl}>Read Post</a>
```

### 4. Parameter Matchers (`defineParams` in `src/params.ts`)

In SvelteKit 3, all param matchers are declared in a single `src/params.ts` file using Standard Schema or custom functions (directory `src/params/` is removed).

```ts
// src/params.ts
import { defineParams } from '@sveltejs/kit/params';
import * as v from 'valibot';

export const params = defineParams({
	// Standard Schema validator with coercion
	integer: v.pipe(v.string(), v.toNumber()),

	// Custom matcher function returning parsed value or undefined
	uuid: (param: string) => {
		const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		return regex.test(param) ? param : undefined;
	},

	category: (param: string) => {
		const allowed = ['tech', 'design', 'business'] as const;
		return allowed.find((c) => c === param);
	}
});
```

```svelte
<!--- src/routes/posts/[id=integer]/+page.svelte --->
<script lang="ts">
	import type { PageProps } from './$types';
	let { params }: PageProps = $props(); // params.id is typed as number
</script>
```

### 5. Link Directives & Options

| Directive | Allowed Values | Effect |
|---|---|---|
| `data-sveltekit-preload-data` | `"hover" \| "tap" \| false` | Preloads page `load()` data on hover or touch start (`"off"` removed) |
| `data-sveltekit-preload-code` | `"eager" \| "viewport" \| "hover" \| "tap" \| false` | Preloads JS bundles when link enters viewport or is hovered |
| `data-sveltekit-reload` | (boolean attribute) | Forces full browser navigation (bypasses client router) |
| `data-sveltekit-noscroll` | (boolean attribute) | Prevents scrolling to top after navigation |
| `data-sveltekit-replacestate` | (boolean attribute) | Replaces current history state instead of adding new entry |
| `data-sveltekit-keepfocus` | (boolean attribute) | Retains current element focus after navigation |

### 6. Component Snapshots (`snapshot`)

```svelte
<!--- src/routes/search/+page.svelte --->
<script lang="ts">
	import type { Snapshot } from './$types';

	let query = $state('');
	let scrollPos = $state(0);

	export const snapshot: Snapshot<{ query: string; scrollPos: number }> = {
		capture: () => ({ query, scrollPos: window.scrollY }),
		restore: (val) => {
			query = val.query;
			window.scrollTo(0, val.scrollPos);
		}
	};
</script>

<input bind:value={query} placeholder="Search..." />
```

## 📋 Rules & Invariants

1. **`goto` with `shallow: true` replaces `pushState`/`replaceState`.** Update `page.state` while keeping current layout/component trees intact.
2. **`refreshAll()` replaces `invalidateAll()`.** `invalidateAll()` is deprecated in SvelteKit 3.
3. **Param matchers must be declared in `src/params.ts` via `defineParams`.** Individual files in `src/params/*` are no longer parsed.
4. **`$app/paths` exports `asset()`, `resolve()`, and `match()`.** `base`, `assets`, and `resolveRoute` exports have been removed.
5. **`data-sveltekit-*` attributes use `false`, not `'off'`.** `<a data-sveltekit-preload-data="false">` is the valid syntax.
6. **`goto()` rejects when target URL does not resolve to an app route.** Always wrap speculative `goto()` calls in try/catch or use `window.location.href` for non-route links.
7. **Clicks on current page links trigger `refreshAll()` by default.** Navigating to the already-active URL automatically refreshes current page data in SvelteKit 3.
8. **`$app/env` replaces `$app/environment`.** Import `browser`, `dev`, `building`, `version` from `$app/env`.

## ⚠️ Gotchas & Fixes

| ❌ Symptom / verbatim error | Cause | ✅ Fix |
|---|---|---|
| `Cannot find module '$app/environment'` | Renamed to `$app/env` in SvelteKit 3 | Update import: `import { browser, dev } from '$app/env';` |
| `Cannot find module '$app/paths'` exports for `base` or `resolveRoute` | `base` and `resolveRoute` removed | Use `resolve('/path')` or `resolve('/blog/[slug]', { slug })` from `$app/paths` |
| `pushState / replaceState is deprecated` | SvelteKit 3 shallow routing update | Replace with `goto(url, { shallow: true, state: { ... } })` |
| Param matcher in `src/params/integer.ts` ignored | SvelteKit 3 moved matchers to `src/params.ts` | Consolidate matchers in `src/params.ts` using `export const params = defineParams({ ... })` |
| `goto()` Promise unhandled rejection on 404 URL | SvelteKit 3 `goto` throws for unknown routes | Verify route exists before navigating, or catch the rejected Promise |
| `data-sveltekit-preload-data="off"` still preloads | `'off'` string is invalid in v3 | Change attribute to `data-sveltekit-preload-data="false"` |
| `page.state` values lost on full browser page refresh | Page state is ephemeral in-memory state | Use URL search parameters or `snapshot` if state must survive refresh |
