# Architectural Decisions & Technical Context

**Current Status:** Alpha MVP (Functional Browsing & Search) **Target:**
Multi-platform (Web, iOS, Android via Tauri) **Stack:** SvelteKit (SPA
Mode/Svelte 5), Go (pREST), PostGIS (PostgreSQL 18), Leaflet, DaisyUI.

## 🛑 Technical Constraints (Strict)

- **Architecture:** Client-Side Rendering (SPA) only. `adapter-static` is
  installed.
- **Routing:** No `+page.server.ts` or `+server.ts` files allowed. Logic must
  run in the browser or the Go API.
- **State:** Use Svelte 5 Runes (`$state`, `$effect`). No legacy stores.
- **UI:** Use **DaisyUI** class names strictly. No custom CSS unless necessary
  for layout.
- **API:** All data fetching happens via standard `fetch()` to the pREST backend (localhost:3000).

I am working on the Chimera Project. It is a SvelteKit 5 + Go/PostGIS Real
Estate app running in SPA mode (for Tauri compatibility).

## Rendering Strategy: Client-Side Rendering (SPA)

To ensure compatibility with **Tauri** (mobile/desktop wrappers) and static
hosting (GitHub Pages), the application is architected strictly as a **Single
Page Application (SPA)**.

### The Decision

We rely on **Client-Side Rendering (CSR)**. The server's only job is to serve
the initial HTML/JS bundle. The browser/webview takes over immediately to fetch
data and render the UI.

### Configuration

- **Adapter:** `@sveltejs/adapter-static`
- **Mode:** SPA Mode (Fallback enabled)
- **SSR:** Disabled globally.

**`svelte.config.js`:**

```javascript
kit: {
  adapter: adapter({
    fallback: "index.html", // Enables SPA routing
    strict: true,
  });
}
```

**`src/routes/+layout.ts`:**

```typescript
export const ssr = false; // Disable Server-Side Rendering
export const prerender = true; // Generate the app shell at build time
```

---

## Frontend Constraints (The "No-Node" Rule)

Because the application must run inside a WebView (iOS/Android) where no Node.js
runtime exists, strictly adhere to these rules:

### ❌ Strictly Prohibited

1. **No `+page.server.ts`**: Files ending in `.server.ts` require a server
   runtime. They will break the mobile build.
2. **No `+server.ts` (API Routes)**: Do not build backend logic inside
   SvelteKit. All logic belongs in the Go/pREST backend.
3. **No Server-Side Secrets**: Never access private environment variables
   (`$env/static/private`) in the frontend code.

### ✅ Required Patterns

1. **Universal Load Functions**: Use `+page.ts` (not `.server.ts`) for route
   data fetching.
2. **Standard Fetch**: Use the native `fetch` API to communicate with the
   external Go backend.
3. **Environment Handling**:
   ```typescript
   import { browser } from "$app/environment";
   // Dynamic host switching based on environment
   const apiHost = browser
     ? "http://localhost:3000"
     : "https://api.production.com";
   ```

---

## Deployment Pipeline

The architecture supports a "Write Once, Deploy Everywhere" pipeline.

| Target               | Mechanism      | Infrastructure                                                                                  |
| :------------------- | :------------- | :---------------------------------------------------------------------------------------------- |
| **Demo / MVP**       | Static Hosting | **GitHub Pages**. Builds to `build/` folder. Serves static assets.                              |
| **Production Web**   | Containerized  | **Docker + Traefik**. The Traefik container serves the static build. Traefik handles SSL/Proxy. |
| **Mobile / Desktop** | Hybrid Wrapper | **Tauri**. Wraps the static build in a native WebView. Communicates with the remote Go API.     |

---

## Backend Communication

The Frontend is completely decoupled from the Backend.

- **API Protocol:** REST (via pREST auto-generation).
- **Authentication:** JWT (stored in `HttpOnly` cookies or LocalStorage
  depending on Tauri vs Web context).
- **Geospatial Data:** Fetched as GeoJSON or Lat/Lng fields from PostGIS views
---

## Developer Workflow & Style Guide

- **State Management:** Use Svelte 5 Runes (`$state`, `$derived`, `$effect`).
  Avoid legacy stores where possible.
- **Components:** Atomic design. Keep components generic (in
  `$lib/components/ui`) vs domain-specific (in `$lib/components/domain`).
- **I18n:** Use **Paraglide-JS**. All text must be tokenized (e.g.,
  `m.home_title()`). No hardcoded strings.
- **Type Safety:** Strict TypeScript. Generate types via `deno task prepare`
  when adding dynamic routes.

---

## Summary for LLMs

When generating code for this project:

1. **Assume `ssr = false`**.
2. **Never** generate Node.js specific code (fs, path, crypto) for the frontend.
3. **Always** fetch data from the external Go API, never local databases.
4. **Prioritize** standard web APIs that work in both Chrome and Safari
   WebViews.
