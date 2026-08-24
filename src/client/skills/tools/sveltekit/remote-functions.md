# Remote Functions & RPC

> [!abstract] Purpose
> Type-safe client-server communication using `.remote.ts` modules: RPC queries (`query`, `query.batch`, `query.live`), mutations (`form`, `command`, `prerender`), progressive enhancement via `{@attach}`, field bindings (`.as()`), client-side preflight validation, single-flight mutations, and request context access via `getRequestEvent()`.

## ⚡ Remote Functions Patterns & Reference

### 1. Configuration & Module Structure

```ts
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: { experimental: { async: true } },
			experimental: { remoteFunctions: true }
		})
	]
});
```

Remote functions are exported from files containing a `remote` segment (e.g. `src/routes/data.remote.ts` or `src/lib/posts.remote.ts`). Files in `server` directories cannot be remote modules (must not be imported by client).

### 2. Queries (`query`, `query.batch`, `query.live`)

```ts
// src/routes/posts.remote.ts
import * as v from 'valibot';
import { query } from '$app/server';
import { error } from '@sveltejs/kit';
import * as db from '#lib/server/db';

// Simple query (no arguments)
export const getPosts = query(async () => {
	return await db.sql`SELECT id, title, slug FROM posts ORDER BY created_at DESC`;
});

// Validated argument query (Standard Schema compliant: Valibot, Zod, ArkType)
export const getPost = query(v.string(), async (slug) => {
	const [post] = await db.sql`SELECT * FROM posts WHERE slug = ${slug}`;
	if (!post) error(404, 'Post not found');
	return post;
});

// Batched query: resolves N+1 calls in the same macrotask
export const getAuthor = query.batch(v.string(), async (authorIds) => {
	const authors = await db.sql`SELECT * FROM authors WHERE id = ANY(${authorIds})`;
	const map = new Map(authors.map((a: any) => [a.id, a]));
	return (id) => map.get(id); // Returns (input, index) => output
});

// Live query: streaming real-time async generator
export const getFeedUpdates = query.live(v.string(), async function* (channelId) {
	while (true) {
		yield await db.getLatestMessage(channelId);
		await new Promise((r) => setTimeout(r, 2000));
	}
});
```

```svelte
<!--- src/routes/+page.svelte --->
<script lang="ts">
	import { getPosts, getPost, getAuthor, getFeedUpdates } from './posts.remote';

	let { params } = $props();

	// In Svelte 5, await query promises directly
	const activePost = $derived(await getPost(params.slug));
	const liveFeed = getFeedUpdates('global');
</script>

<h1>Recent Posts</h1>
{#each await getPosts() as post}
	<article>
		<h2>{post.title}</h2>
		<p>Author: {(await getAuthor(post.authorId))?.name}</p>
	</article>
{/each}

<!-- Live query state & manual reconnect -->
<p>Feed status: {liveFeed.connected ? 'connected' : 'reconnecting...'}</p>
<button onclick={() => liveFeed.reconnect()}>Force Reconnect</button>
<button onclick={() => getPosts().refresh()}>Refresh Posts</button>
```

### 3. Forms (`form`), Field Bindings & Validation

```ts
// src/routes/posts.remote.ts
import * as v from 'valibot';
import { form } from '$app/server';
import { redirect, invalid } from '@sveltejs/kit';
import * as auth from '#lib/server/auth';
import * as db from '#lib/server/db';

export const createPost = form(
	v.object({
		title: v.pipe(v.string(), v.nonEmpty('Title is required')),
		content: v.pipe(v.string(), v.minLength(10, 'Must be at least 10 chars')),
		_secretToken: v.optional(v.string()) // leading underscore: never sent back on failed submit
	}),
	async ({ title, content }, issue) => {
		const user = await auth.getUser();
		if (!user) error(401, 'Unauthorized');

		const exists = await db.hasTitle(title);
		if (exists) {
			// Programmatic validation error tied to specific field
			invalid(issue.title('Title is already taken'));
		}

		const slug = title.toLowerCase().replace(/\s+/g, '-');
		await db.sql`INSERT INTO posts (title, slug, content) VALUES (${title}, ${slug}, ${content})`;
		redirect(303, `/blog/${slug}`);
	}
);
```

```svelte
<!--- src/routes/new/+page.svelte --->
<script lang="ts">
	import { createPost } from './posts.remote';
	import * as v from 'valibot';

	const clientSchema = v.object({
		title: v.pipe(v.string(), v.nonEmpty()),
		content: v.pipe(v.string(), v.minLength(10))
	});

	const { title, content, _secretToken } = createPost.fields;
</script>

<!-- Progressive enhancement enabled automatically via {@attach} on spread -->
<form {...createPost.preflight(clientSchema)}>
	<label>
		Title
		<input {...title.as('text')} />
		{#each title.issues() ?? [] as issue}
			<span class="error">{issue.message}</span>
		{/each}
	</label>

	<label>
		Content
		<textarea {...content.as('text')}></textarea>
		{#each content.issues() ?? [] as issue}
			<span class="error">{issue.message}</span>
		{/each}
	</label>

	<input {..._secretToken.as('password')} />

	<button disabled={!!createPost.pending}>Publish</button>
</form>

<!-- Global issues -->
{#each createPost.fields.allIssues() ?? [] as issue}
	<p class="global-error">{issue.message}</p>
{/each}
```

### 4. Commands (`command`) & Single-Flight Mutations

```ts
// src/routes/likes.remote.ts
import * as v from 'valibot';
import { query, command, requested } from '$app/server';
import * as db from '#lib/server/db';

export const getLikes = query(v.string(), async (id) => {
	const [row] = await db.sql`SELECT likes FROM posts WHERE id = ${id}`;
	return row?.likes ?? 0;
});

export const addLike = command(
	v.object({ id: v.string() }),
	async ({ id }) => {
		await db.sql`UPDATE posts SET likes = likes + 1 WHERE id = ${id}`;

		// 1. Server-driven single-flight mutation refresh
		void getLikes(id).refresh();

		// 2. Or accept client-requested query instances with a safety limit
		for (const { query } of requested(getLikes, 5)) {
			void query.refresh();
		}
	}
);
```

```svelte
<!--- src/routes/+page.svelte --->
<script lang="ts">
	import { getLikes, addLike } from './likes.remote';

	let { post } = $props();
</script>

<button
	onclick={async () => {
		// Client requests specific query update with optimistic override
		await addLike({ id: post.id }).updates(
			getLikes(post.id).withOverride((current) => current + 1)
		);
	}}
>
	Like ({await getLikes(post.id)})
</button>
```

### 5. Server Context Access (`getRequestEvent`)

```ts
// src/lib/server/auth.ts
import { getRequestEvent } from '$app/server';

export function getUser() {
	const { cookies, locals } = getRequestEvent();
	const token = cookies.get('session');
	return locals.user ?? (token ? parseSession(token) : null);
}
```

## 📋 Rules & Invariants

1. **`experimental.remoteFunctions` & `experimental.async` are mandatory.** Both must be enabled in `vite.config.ts` for `.remote.ts` modules to compile and `await` in templates to resolve.
2. **`query()` throws if accessing `event.url`, `event.params`, or `event.route`.** Queries can be invoked from any page or background task; all inputs must be passed explicitly as query parameters.
3. **Form controls MUST use attributes from `field.as(...)`.** Manually specifying a plain `name="message"` bypasses SvelteKit 3's type-coercion prefixing (`b:`, `n:`) and will cause submission rejection.
4. **`requested(queryFn, limit)` requires an explicit integer limit.** Unbounded client-requested query refreshes pose a Denial-of-Service vector. Never pass `Infinity` without strict external rate-limiting.
5. **Sensitive inputs must use a leading underscore `_`** (e.g. `_password`, `_creditCard`). SvelteKit omits underscore-prefixed fields when repopulating form values on validation failure.
6. **Live queries (`query.live`) must not be cached in service workers.** Cloned streaming responses continue open-ended execution. Ensure service worker route caches exclude `Cache-Control: no-store` responses.
7. **Query arguments are deduplicated and cached during page lifetime.** `getPost(id) === getPost(id)` while mounted. Calling `getPost(id).refresh()` updates all mounted consumers simultaneously.
8. **Preflight schemas must be exported from shared modules or `<script module>`.** You cannot export helper constants or schemas from a `.remote.ts` file itself.

## ⚠️ Gotchas & Fixes

| ❌ Symptom / verbatim error | Cause | ✅ Fix |
|---|---|---|
| `Cannot access event.url inside remote query` | Reading `event.url`, `event.params`, or `event.route` in a `query()` callback | Pass the URL/param explicitly as an argument into the query function: `getPost(params.slug)` |
| `Missing required limit argument in requested(...)` | Calling `requested(myQuery)` without 2nd argument | Specify maximum instances the server will re-fetch: `requested(myQuery, 10)` |
| `Remote functions require compilerOptions.experimental.async: true` | `await` expression used in template or remote query without compiler async flag | Enable `compilerOptions: { experimental: { async: true } }` in `sveltekit()` in `vite.config.ts` |
| `Form control without matching field.as() rejected` | Writing `<input name="title" />` manually inside `<form {...createPost}>` | Use field descriptor: `<input {...createPost.fields.title.as('text')} />` |
| Live query generator never disconnects on client navigation | Service worker cached the streaming endpoint | Exclude `/remote/` endpoints or `no-store` responses from service worker runtime cache |
| Checkbox field inside form schema resolves to `undefined` when unchecked | HTML form submission omits unchecked checkboxes | Use `v.optional(v.boolean(), false)` in Valibot or `z.coerce.boolean()` in Zod |
| Client-requested query override (`withOverride`) reverts immediately | Mutation failed or server handler did not call `requested(...).refreshAll()` | Ensure server handler processes `requested(query, limit)` or returns matching result |
