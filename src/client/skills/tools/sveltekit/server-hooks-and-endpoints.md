# Server Endpoints, Hooks, Cookies & Observability

> [!abstract] Purpose
> Server-side execution surface in SvelteKit 3: API endpoints (`+server.ts`), server and client hooks (`handle`, `handleFetch`, `handleError`, `reroute`, `transport`), cookie v2 management, error handling pipelines, OpenTelemetry instrumentation (`src/instrumentation.server.ts`), and server-only isolation.

## ⚡ Server Endpoints & Hooks Patterns & Reference

### 1. API Endpoints (`+server.ts`)

```ts
// src/routes/api/users/[id]/+server.ts
import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as db from '#lib/server/db';

export const GET: RequestHandler = async ({ params, locals, setHeaders }) => {
	setHeaders({ 'cache-control': 'public, max-age=300' });
	const user = await db.getUser(params.id);
	if (!user) error(404, 'User not found');
	return Response.json(user); // Use standard Response.json() (json() helper is deprecated)
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const body = await request.json();
	const created = await db.createUser(body);
	return Response.json(created, { status: 201 });
};

export const DELETE: RequestHandler = async ({ params }) => {
	await db.deleteUser(params.id);
	return new Response(null, { status: 204 }); // 204 returns empty body per HTTP spec
};

// Catches unhandled HTTP methods (MOVE, PROPFIND, etc.)
export const fallback: RequestHandler = async ({ request }) => {
	return new Response(`Method ${request.method} not allowed`, { status: 405 });
};
```

### 2. Server Hooks (`src/hooks.server.ts`)

```ts
// src/hooks.server.ts
import type { Handle, HandleServerError, HandleFetch } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import * as auth from '#lib/server/auth';

const authHandle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get('session_token');
	event.locals.user = token ? await auth.validateSession(token) : null;

	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%LANG%', 'en'),
		filterSerializedResponseHeaders: (name) => name.startsWith('x-')
	});
};

const loggingHandle: Handle = async ({ event, resolve }) => {
	const start = performance.now();
	const response = await resolve(event);
	console.log(`${event.request.method} ${event.url.pathname} -> ${response.status} (${(performance.now() - start).toFixed(1)}ms)`);
	return response;
};

export const handle: Handle = sequence(loggingHandle, authHandle);

export const handleFetch: HandleFetch = async ({ event, request, fetch }) => {
	if (request.url.startsWith('https://api.internal/')) {
		request.headers.set('authorization', `Bearer ${event.locals.token}`);
	}
	return fetch(request);
};

// SvelteKit 3: handleError receives ALL errors and can influence status code
export const handleError: HandleServerError = async ({ error, event, status, message }) => {
	const errorId = crypto.randomUUID();
	console.error(`[${errorId}] ${status} ${event.url.pathname}:`, error);

	return {
		message: status === 404 ? 'Page Not Found' : 'An unexpected error occurred',
		status, // Can override or preserve the HTTP status
		errorId
	};
};
```

### 3. Cookies Management (Cookie v2)

```ts
// src/routes/login/+page.server.ts
import type { Actions } from './$types';
import type { SerializeOptions } from '@sveltejs/kit';

export const actions: Actions = {
	default: async ({ cookies, request }) => {
		const token = 'xyz_session_token';

		const cookieOpts: SerializeOptions = {
			path: '/',         // Default in SvelteKit 3 (applies site-wide)
			httpOnly: true,    // Default: true
			secure: true,      // Default: true in production, false in dev
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 7
		};

		// Cookie names MUST contain only ASCII characters in SvelteKit 3
		cookies.set('session_token', token, cookieOpts);
		return { success: true };
	}
};
```

### 4. Custom Serialization Hooks (`transport`)

```ts
// src/hooks.server.ts and src/hooks.client.ts
import type { Transport } from '@sveltejs/kit';
import { Decimal } from 'decimal.js';

export const transport: Transport = {
	Decimal: {
		encode: (value) => value instanceof Decimal && value.toString(),
		decode: (raw) => new Decimal(raw)
	}
};
```

### 5. URL Rerouting (`reroute`)

```ts
// src/hooks.server.ts / src/hooks.client.ts
import type { Reroute } from '@sveltejs/kit';

const translated: Record<string, string> = {
	'/acerca-de': '/about',
	'/contactos': '/contact'
};

export const reroute: Reroute = ({ url }) => {
	if (url.pathname in translated) {
		return translated[url.pathname];
	}
};
```

### 6. Server Instrumentation (`src/instrumentation.server.ts`)

```ts
// src/instrumentation.server.ts
// Automatically executed before application server starts
import { registerOTel } from '@vercel/otel';

export function register() {
	registerOTel({ serviceName: 'my-sveltekit-app' });
}
```

## 📋 Rules & Invariants

1. **`path: '/'` is the cookie default in SvelteKit 3.** In earlier versions, omitting `path` caused request-path scoping or threw errors. Set `path: ''` if path-scoped cookies are explicitly required.
2. **Cookie names must be ASCII-only.** Non-ASCII characters (e.g. `á`, `ñ`, emoji) in cookie keys throw exceptions under `cookie` v2.
3. **`handleError` intercepts ALL errors in SvelteKit 3.** Both unexpected runtime exceptions and intentional `error(status, message)` calls are dispatched to `handleError`.
4. **`error(status, message, extraProps?)` takes a string as the 2nd argument.** Passing an object literal like `error(400, { code: 'FAIL' })` is a compile and runtime error.
5. **`Response.json()` replaces deprecated `json()` helper.** Import native `Response.json(data, init)` instead of `import { json } from '@sveltejs/kit'`.
6. **204 No Content responses have no body.** Empty `2xx` responses from `+server.ts` omit the JSON payload envelope per HTTP standards.
7. **Any folder named `server` is strictly server-only.** Modules inside any directory named `server` (or files matching `*.server.ts` / `server.ts`) are blocked from client bundles.
8. **External redirects must specify `{ external: true }`.** `redirect(303, 'https://example.com', { external: true })` prevents unintentional open-redirect vulnerabilities.
9. **`getRequest()` and `setResponse()` in `@sveltejs/kit/node` are synchronous.** Do not `await` these calls in custom Node server integrations.

## ⚠️ Gotchas & Fixes

| ❌ Symptom / verbatim error | Cause | ✅ Fix |
|---|---|---|
| `TypeError: Argument 2 to error() must be a string` | Passing metadata object as 2nd param: `error(404, { code: 'NOT_FOUND' })` | Pass string 2nd, metadata 3rd: `error(404, 'Not Found', { code: 'NOT_FOUND' })` |
| `TypeError: Cookie name contains invalid characters` | Non-ASCII character in cookie key with cookie v2 | Ensure cookie name contains only printable ASCII (A-Z, a-z, 0-9, -, _) |
| `Cannot redirect to external URL without external option` | Calling `redirect(303, 'https://remote.com')` without `{ external: true }` | Pass options object: `redirect(303, 'https://remote.com', { external: true })` |
| `Cannot import '#lib/server/db' in client code` | SvelteKit compiler blocking server module import in `+page.svelte` or `+page.ts` | Move database call to `+page.server.ts` or a `.remote.ts` query |
| Deprecation warning for `import { json, text } from '@sveltejs/kit'` | `json` and `text` are deprecated in SvelteKit 3 | Replace with native Web APIs: `Response.json(data)` and `new Response(text)` |
| `App.Error` missing `status` property in TypeScript | Outdated `app.d.ts` declaration | Update `interface Error` in `src/app.d.ts` — `status: number` is now provided natively |
| `handleFetch` does not forward cookies to external APIs | Native `fetch` drops credentials for cross-origin URLs | Explicitly copy `event.request.headers.get('cookie')` to outgoing request in `handleFetch` |
