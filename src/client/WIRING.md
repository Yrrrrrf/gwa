# 🔌 The Wiring: Architectural Blueprint & Compatibility Harness

> *A comprehensive technical reference documenting the symbiotic runtime interop, pinned dependencies, CJS loader hooks, and matrix gates holding the GWA Client monorepo together.*

---

## 🧭 1. Architectural Overview & Design Philosophy

The GWA Client workspace is a high-performance **Deno-first monorepo** hosting multiple framework targets side-by-side:
- **SDK Modules**: Core logic, reactive state, shared UI bridges, and universal host adapters (`sdk/core`, `sdk/state`, `sdk/ui`, `sdk/api`).
- **Framework Applications**: React 19 (`apps/react`), Vue 3 (`apps/vue`), SvelteKit 5 (`apps/svelte`, `apps/vision`).

### Core Principles
1. **Zero Boilerplate in `deno.json`**:
   No fake devDependencies, no standalone `vite` entry, and no extraneous tooling imports polluting the manifest. Command-line tooling runs via `deno run -A npm:<pkg>`.
2. **Single Toolchain Source of Truth (`vite-plus`)**:
   All bundling, dev servers, preview servers, and unit tests execute on the `@voidzero-dev/vite-plus-core` engine (Vite 8 + Rolldown/Oxc).
3. **Zero Ambient Hacks in Source Code**:
   Framework applications do not carry workaround ambient shims (such as `declare module "*.vue"` or artificial `vite-env.d.ts` declarations). The type-checking engines must properly understand native framework SFCs.
4. **Declarative Quality Gates**:
   A unified matrix runner in `scripts/cli/` drives tests, type checking, formatting, and builds with terminal dashboards, sub-second benchmarks, and deterministic exit codes.

```
                  ┌─────────────────────────────────────┐
                  │              justfile               │
                  │  (prepare ➔ test ➔ check ➔ build)   │
                  └──────────────────┬──────────────────┘
                                     │
          ┌──────────────────────────┴──────────────────────────┐
          ▼                                                     ▼
┌──────────────────┐                                  ┌──────────────────┐
│  deno.json       │                                  │  scripts/cli/    │
│  (Clean Manifest)│                                  │  (Matrix Runner) │
└─────────┬────────┘                                  └─────────┬────────┘
          │                                                     │
          │                                                     ▼
          │                                           ┌──────────────────┐
          │                                           │ensureNodeCompat()│
          │                                           │(The Secret Sauce)│
          │                                           └─────────┬────────┘
          ▼                                                     │
┌───────────────────────────────────────────────────────────────┴────────┐
│                               RUNTIME WIRING                           │
│                                                                        │
│ • Vite canonical symlink  ➔  @voidzero-dev/vite-plus-core (Vite 8)     │
│ • SvelteKit vite link     ➔  @voidzero-dev/vite-plus-core (De-duped)   │
│ • TypeScript compiler     ➔  Pinned to typescript@6                    │
│ • Svelte check runner     ➔  svelte-check-native + TSGO_BIN            │
│ • Volar / vue-tsc hook    ➔  Module.prototype._compile interceptor     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📌 2. Pinned Versions & Toolchain Matrix

To prevent ecosystem version drift and ABI breakage across Deno and Node tooling, the following versions are strictly aligned:

| Tool / Package | Pinned Version / Specifier | Role & Purpose | Why It Must Remain Pinned |
| :--- | :--- | :--- | :--- |
| **`vite-plus`** | `npm:vite-plus` | Core bundler, dev engine, and test orchestrator | Powers unified Vite 8 + Vitest 4 environment across all SDKs and apps. |
| **`@voidzero-dev/vite-plus-core`** | Linked to `node_modules/vite` | Canonical Vite 8 runtime | Avoids version collision with standalone Vite 6. |
| **`typescript`** | `npm:typescript@6` | Core type checking and AST parsing | Typescript 7 is experimental/preview and breaks Volar/Svelte compiler AST contracts. |
| **`@typescript/native-preview`** | `7.0.0-dev.20260707.2` | Native Go-based compiler binary (`tsgo`) | Powers `svelte-check-native` for **10x–40x faster** Svelte type-checking. |
| **`@sveltejs/kit`** | `npm:@sveltejs/kit@next` | SvelteKit framework sync & routing | Required for Svelte 5 and Vite 8 compatibility during `svelte-kit sync`. |
| **`vue-tsc`** | `npm:vue-tsc@3.3.11` | Vue 3 Single-File Component type checker | Pinned in `scripts/check.just` for deterministic SFC diagnostics. |
| **`@volar/typescript`** | `2.4.28` (via `vue-tsc`) | Virtual TypeScript program generator | Core Volar program proxy patched for Deno CJS runtime execution. |

---

## ⚙️ 3. The Runtime Interop: `ensureNodeCompat()`

Located in [`scripts/cli/workspace.ts`](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/client/scripts/cli/workspace.ts), `ensureNodeCompat()` runs automatically and idempotently before every quality gate and build step. It bridges Deno's isolated package management with traditional Node.js package layout expectations.

### 1. Canonical Vite Unification
* **The Problem**: Running `npm:vitest` or modern SvelteKit alongside `vite-plus` can cause npm package resolution to resolve an incompatible Vite 6 fallback.
* **The Wiring**: Scans `node_modules/.deno` for `@voidzero-dev+vite-plus-core@*` and symlinks `node_modules/vite` directly to `@voidzero-dev/vite-plus-core`.

### 2. SvelteKit Internal Vite Relinking
* **The Problem**: `@sveltejs/kit` installs its own internal `node_modules/vite` symlink inside `.deno/@sveltejs+kit@*`. When Vitest runs, SvelteKit throws `RunnableDevEnvironment` errors because two different Vite instances exist in memory.
* **The Wiring**: Traverses `.deno/@sveltejs+kit@*` and repoints its internal `vite` symlink directly to `@voidzero-dev/vite-plus-core`. Both Vitest and SvelteKit share the exact same runtime instance.

### 3. TypeScript 6 Fallback Pinning for `vue-tsc`
* **The Problem**: In environments where `@typescript/native-preview` brings in TypeScript 7 metadata, `vue-tsc` can accidentally bind to `typescript@7`, failing with internal AST mismatches.
* **The Wiring**: Detects if `vue-tsc`'s internal `typescript` symlink points to `typescript@7` and dynamically remounts it to `typescript@6`.

### 4. Native Svelte Checker (`svelte-check-native` + `TSGO_BIN`)
* **The Problem**: `svelte-check-native` requires the native binary `tsgo` to be discoverable in `PATH` or configured via `TSGO_BIN`.
* **The Wiring**:
  - Symlinks `@typescript/native-preview` into `node_modules/@typescript/native-preview`.
  - Creates a `tsgo.js` symlink pointing to the binary in `bin/`.
  - Automatically locates the platform-specific native binary (`native-preview-linux-*` or `typescript-linux-*`) and exports `Deno.env.set("TSGO_BIN", bin)`.

### 5. Deno CJS Loader Interception for Volar / `vue-tsc`
* **The Problem**:
  - Volar's `runTsc.js` intercepts TypeScript compilation by monkey-patching `fs.readFileSync` so that `require('typescript/lib/tsc')` receives modified code injected with `proxyCreateProgram`.
  - In Node.js, `require()` invokes `fs.readFileSync` in user-space JavaScript.
  - **In Deno, the CJS module loader is implemented in Rust.** Deno reads the file from disk internally and bypasses `fs.readFileSync` completely. Consequently, `tsc.js` runs completely unpatched, fails to recognize `.vue` imports, and throws:
    ```text
    apps/vue/src/main.ts:2:17 - error TS2307: Cannot find module './App.vue' or its corresponding type declarations.
    ```
* **The Wiring**:
  `ensureNodeCompat()` patches `@volar/typescript/lib/quickstart/runTsc.js` to hook into `Module.prototype._compile`:
  ```javascript
  const Module = require('module');
  const origCompile = Module.prototype._compile;
  Module.prototype._compile = function (content, filename, ...rest) {
      if (filename === tscPath || filename === path.join(path.dirname(tscPath), '_tsc.js')) {
          try {
              content = transformTscContent(content, proxyApiPath, extraSupportedExtensions, extraExtensionsToRemove, __filename, typescriptObject);
          } catch {
              const requireRegex = /module\.exports\s*=\s*require\((?:"|')(?<path>\.\/\w+\.js)(?:"|')\)/;
              const requirePath = requireRegex.exec(content)?.groups?.path;
              if (requirePath) {
                  const realContent = fs.readFileSync(path.join(path.dirname(tscPath), requirePath), 'utf8');
                  content = transformTscContent(realContent, proxyApiPath, extraSupportedExtensions, extraExtensionsToRemove, __filename, typescriptObject);
              }
          }
      }
      return origCompile.call(this, content, filename, ...rest);
  };
  ```
  When Deno compiles `tsc.js` and `_tsc.js`, `_compile` intercepts the file buffer in memory and injects the Volar language plugins. Vue SFC type checking passes with **0 errors and 0 source modifications**.

---

## 🚀 4. Pipeline & Lifecycle Commands

All operations are organized under the root [`justfile`](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/client/justfile) through specialized modules in `scripts/`:

```bash
just cycle   # The atomic end-to-end gate: prepare ➔ (test + check -vp) ➔ build
```

### Breakdown of Stages

1. **`just prepare`** (`scripts/dev.just`):
   - Purges caches and stale lock artifacts.
   - Runs `deno install --entrypoint npm:typescript@6`.
   - Runs `npm:@sveltejs/kit@next/svelte-kit sync` on `apps/vision` and `apps/svelte`.
2. **`just test`** (`scripts/test.just`):
   - Executes Vitest suites across `sdk/core`, `sdk/state`, `apps/react`, `apps/vue`, `apps/svelte`, and `apps/vision` using the unified config [`config/vitest.config.ts`](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/client/config/vitest.config.ts).
3. **`just check`** (`scripts/check.just`):
   - **`fmt`**: `biome format` with zero fixes needed.
   - **`lint`**: `biome lint` across all workspaces.
   - **`types`**: Dynamic declarative matrix gate running:
     - `svelte-check-native` for SvelteKit apps and Svelte runes state.
     - `deno check` for SDK TypeScript mod entries.
     - `tsc` (`typescript@6`) for React.
     - `vue-tsc` for Vue 3 SFCs.
4. **`just build`** (`scripts/deploy.just`):
   - Concurrently bundles production assets for `react`, `svelte`, `vision`, and `vue` via `vite-plus`.

---

## 🛡️ 5. Golden Rules for Maintaining This Harness

To keep this setup reliable and avoid regressions, follow these rules:

1. **Keep `deno.json` Clean**:
   Never add `"vite"` or `"vue-tsc"` to `deno.json`'s `"imports"` block. CLI tools must be called with their fully-qualified specifier (`deno run -A npm:<pkg>`).
2. **Do Not Add Ambient Source Shims**:
   Never re-introduce `env.d.ts` or `declare module "*.vue"` files in application source directories. If `vue-tsc` fails, ensure `ensureNodeCompat()` is executing and patching `@volar/typescript`.
3. **TypeScript Major Upgrades**:
   Do not bump TypeScript to `typescript@7` until `@volar` and `@sveltejs/kit` officially support TypeScript 7's new compiler internals.
4. **Preserve `ensureNodeCompat()` Execution**:
   Any new CLI command or gate in `scripts/cli/` that invokes Node/Vite/TypeScript tools must call `ensureNodeCompat()` before spawning worker processes.
