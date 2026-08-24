# Configuration, Adapters, Subpath Imports & Migration

> [!abstract] Purpose
> Build and deployment architecture for SvelteKit 3: Vite-based configuration (`vite.config.ts`), `#lib` subpath imports, `$app/tsconfig` typing, adapter deployment targets (`node`, `static`, `vercel`, `cloudflare`), environment variable modules (`$app/env/*`), and automated migration tooling.

## ⚡ Configuration & Adapters Patterns & Reference

### 1. `vite.config.ts` Plugin Configuration

In SvelteKit 3, `svelte.config.js` is removed. All compiler and framework options are declared in `vite.config.ts`.

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-auto';

export default defineConfig({
	plugins: [
		sveltekit({
			// Deployment adapter
			adapter: adapter(),

			// Paths & routing
			paths: {
				base: '',
				assets: ''
			},

			// Prerendering rules
			prerender: {
				entries: ['*'],
				handleHttpError: ({ path, status, message }) => {
					if (status === 404) return; // Ignore missing static pages
					throw new Error(`${path} failed with ${status}: ${message}`);
				}
			},

			// Security: CSRF protection is always on; declare trusted origins
			csrf: {
				trustedOrigins: ['https://checkout.stripe.com', 'https://auth.company.com']
			},

			// Content Security Policy
			csp: {
				mode: 'auto',
				directives: {
					'script-src': ['self']
				}
			},

			// Svelte compiler options
			compilerOptions: {
				experimental: {
					async: true // Enables top-level and template await
				}
			},

			// SvelteKit experimental features
			experimental: {
				remoteFunctions: true
			}
		})
	]
});
```

### 2. Node Subpath Imports (`#lib` in `package.json`)

```json
// package.json
{
  "name": "my-sveltekit-app",
  "version": "0.0.1",
  "type": "module",
  "imports": {
    "#lib": "./src/lib/index.ts",
    "#lib/*": "./src/lib/*"
  },
  "devDependencies": {
    "@sveltejs/adapter-auto": "^4.0.0",
    "@sveltejs/kit": "^3.0.0",
    "@sveltejs/vite-plugin-svelte": "^7.0.0",
    "svelte": "^5.56.4",
    "typescript": "^6.0.0",
    "vite": "^8.0.12"
  }
}
```

```ts
// Importing inside components and routes
import { MyComponent } from '#lib';
import { calculateTax } from '#lib/utils/math';
import * as db from '#lib/server/database';
```

### 3. TypeScript Configuration (`$app/tsconfig`)

```json
// tsconfig.json
{
  "extends": "$app/tsconfig",
  "compilerOptions": {
    "moduleResolution": "bundler",
    "target": "ESNext",
    "strict": true
  },
  "include": [
    "src/**/*",
    ".svelte-kit/ambient.d.ts",
    ".svelte-kit/types/**/$types.d.ts",
    "vite.config.ts"
  ],
  "exclude": [
    "node_modules",
    "src/service-worker/**/*"
  ]
}
```

```json
// src/service-worker/tsconfig.json
{
  "extends": "$app/tsconfig/service-worker",
  "include": ["./**/*"]
}
```

### 4. Environment Variables (`$app/env/public` & `$app/env/private`)

```ts
// Public environment variables (accessible in browser and server)
import { PUBLIC_API_BASE_URL } from '$app/env/public';

// Private environment variables (strictly server-only)
import { DATABASE_URL, STRIPE_SECRET_KEY } from '$app/env/private';
```

### 5. Deployment Adapters Matrix

| Target Adapter | Package | Configuration Highlights |
|---|---|---|
| Auto (Zero-Config) | `@sveltejs/adapter-auto` | Default; auto-detects Vercel, Netlify, Cloudflare Pages |
| Node Server | `@sveltejs/adapter-node` | VPS/Docker standalone Node server (`node build/index.js`) |
| Static Site (SSG/SPA) | `@sveltejs/adapter-static` | Generates static HTML/assets (`pages: 'build', assets: 'build', fallback: '200.html'`) |
| Cloudflare Workers | `@sveltejs/adapter-cloudflare-workers` | Edge deployment on Cloudflare runtime |
| Cloudflare Pages | `@sveltejs/adapter-cloudflare` | Cloudflare Pages deployment with static asset optimization |
| Vercel Functions | `@sveltejs/adapter-vercel` | Vercel Serverless / Edge functions + ISR support |
| Netlify Functions | `@sveltejs/adapter-netlify` | Netlify Serverless functions deployment |

### 6. Automated Migration from SvelteKit 2

Run the official automated migration utility:

```bash
# Automated code transformation and config migration
npx sv@next migrate sveltekit-3 --tasks all --confirm
```

## 📋 Rules & Invariants

1. **`svelte.config.js` is forbidden.** Running a build with `svelte.config.js` present fails. Move all configuration into `vite.config.ts`.
2. **`tsconfig.json` must extend `$app/tsconfig` and specify `include`/`exclude`.** `$app/tsconfig` provides compiler flags but intentionally omits file glob arrays.
3. **Service workers require an isolated `src/service-worker/tsconfig.json`.** Do not include `src/service-worker` in root `tsconfig.json` or worker DOM types will conflict.
4. **`csrf.checkOrigin: false` is removed.** CSRF protection is always active; whitelist approved cross-origin callers in `csrf.trustedOrigins`.
5. **Node 22.17+ and Vite 8+ are minimum requirements.** Vite 8 includes native `rolldown` integration for fast bundle creation.
6. **Subpath imports must be defined in `package.json` `"imports"`.** TypeScript and Vite resolve `#lib/*` natively via Node package specifications.
7. **Environment variables use `$app/env/public` and `$app/env/private`.** The legacy `$env/...` namespace is deprecated in SvelteKit 3.

## ⚠️ Gotchas & Fixes

| ❌ Symptom / verbatim error | Cause | ✅ Fix |
|---|---|---|
| `[sveltekit] svelte.config.js is no longer supported` | Project contains a `svelte.config.js` file | Delete `svelte.config.js` and move options to `sveltekit({ ... })` in `vite.config.ts` |
| `Cannot find module '#lib/...' or its type declarations` | Missing `"imports"` field in `package.json` | Add `"imports": { "#lib/*": "./src/lib/*" }` to `package.json` |
| `Cannot find base config file "./.svelte-kit/tsconfig.json"` | Outdated `tsconfig.json` extends target | Change `"extends": "./.svelte-kit/tsconfig.json"` to `"extends": "$app/tsconfig"` |
| `Type error: Property 'trustedOrigins' does not exist on type '{ checkOrigin: boolean }'` | `csrf.checkOrigin` option removed in v3 | Replace `csrf: { checkOrigin: false }` with `csrf: { trustedOrigins: ['https://...'] }` |
| `Cannot find module '$env/static/private'` | Deprecated `$env/...` import | Update to `$app/env/private` or `$app/env/public` |
| Service worker compilation errors regarding `ServiceWorkerGlobalScope` | Root `tsconfig.json` colliding with service worker types | Exclude `src/service-worker` from root `tsconfig.json` and add `src/service-worker/tsconfig.json` |
| `RollupError: Could not resolve entry module` after migration | Static asset paths referencing removed `$app/paths` `assets` variable | Use `asset('image.png')` from `$app/paths` |
