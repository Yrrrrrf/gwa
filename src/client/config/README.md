# Client Configuration Architecture & Tooling Constraints

Dense reference for `config/` tooling, module resolution rules, and environmental constraints across Deno 2, SvelteKit 3, TypeScript, and Vite+.

---

## 🏛️ System Invariants & Monorepo Model

- **No per-package `package.json`**: The workspace relies exclusively on root `deno.json` (`"workspace": ["./sdk/**", "./apps/**"]`), `config/tsconfig.json`, and Vite resolver aliases.
- **Dual module resolution**:
  - Deno runtime: Resolves imports via root `deno.json` (`"@sdk": "./sdk/mod.ts"`, `"@sdk/*": "./sdk/*"`).
  - Bundler / IDE: Resolves imports via `config/app.config.ts` (`resolve.alias`) and `config/tsconfig.json` (`compilerOptions.paths`).
- **Canonical SDK specifier**: Standardized on `@sdk` (root `sdk/mod.ts`) and `@sdk/*` (submodules: `@sdk/ui`, `@sdk/state`, `@sdk/core`, `@sdk/api`).

---

## 📄 File Matrix: What, How, Why & Constraints

### 1. `app.config.ts`
- **What**: Reusable Vite configuration factory (`defineGWA`) for SvelteKit applications (e.g., `apps/vision`).
- **How**:
  - Anchors `@sdk` and `@sdk/*` using `new URL("../sdk", import.meta.url).pathname` (stable Web API, immune to `process.cwd()` drift).
  - Returns `defineConfig({ ... })` synchronously with `tailwindcss()` and `sveltekit({ adapter })`.
- **Why**:
  - **IDE Constraint**: VS Code Svelte extension (`@sveltejs/load-config`) inspects `vite.config.mts` directly in the absence of `svelte.config.js`. Wrapping `defineConfig(async () => ...)` causes the language server to fail to extract `vite-plugin-sveltekit-setup` options, triggering:
    `Error: No Svelte configuration found in vite config. Is @sveltejs/vite-plugin-svelte configured?`
  - Vite natively accepts asynchronous plugin promises (`sveltekit()`) directly in the `plugins: [...]` array.
- **Evolution**:
  - *Phase 1*: Used Node polyfill shims (`RuntimeEnv`, `createLibAliases`, `getAppRoot`) from `_shared.ts`.
  - *Phase 2 (broken)*: Replaced with raw relative path `"/src/lib/$1"` and async factory wrapper.
  - *Phase 3 (current)*: Zero-shim, synchronous, portable `import.meta.url` resolution.

### 2. `sdk.config.ts`
- **What**: Vite configuration factory (`defineSveltePkg`) for SDK component and state packages (`@sdk/ui`, `@sdk/state`).
- **How**: Injects `@tailwindcss/vite` and `@sveltejs/vite-plugin-svelte` with `compilerOptions: { runes: true }` and `configFile: false`.
- **Why**:
  - Allows standalone UI and reactive rune stores (`.svelte.ts`) to compile under Vitest without requiring SvelteKit routing or an app container.
  - `configFile: false` suppresses missing `svelte.config.js` warnings for non-SvelteKit packages.
- **Evolution**: Renamed from `defineGwaPkg` to `defineSveltePkg` to align with modern Svelte 5 package conventions.

### 3. `tsconfig.json`
- **What**: Base TypeScript configuration inherited by all applications and SDK packages.
- **How**:
  - Declares single-wildcard paths:
    ```json
    "paths": {
      "@sdk": ["../sdk/mod.ts"],
      "@sdk/*": ["../sdk/*/src/mod.ts", "../sdk/*"],
      "#lib": ["./src/lib/mod.ts"],
      "#lib/*": ["./src/lib/*"]
    }
    ```
  - Omits `"include"` to allow extending packages (`apps/vision`, `sdk/ui`, `sdk/state`) to define their own scope.
- **Why**:
  - **TS Invariant**: TypeScript syntax prohibits multiple asterisks (e.g. `"@sdk/*/*"`), warning: `Pattern can have at most one '*' character`.
  - **Path Anchor Rule**: Paths in `tsconfig.json` resolve relative to the directory containing the config (`config/`). Therefore, `../sdk/mod.ts` correctly navigates from `config/` to `sdk/`.
- **Evolution**:
  - *Phase 1*: Hardcoded per-SDK paths (`@sdk/core`, `@sdk/api`, `@sdk/state`, `@sdk/ui`).
  - *Phase 2 (broken)*: Invalid double-asterisk wildcard `"@sdk/*/*"`.
  - *Phase 3 (current)*: Declarative `@sdk` and dual-target single-wildcard `@sdk/*`.

### 4. `vitest.config.ts`
- **What**: Root Vitest test runner configuration for poly-runner test suite.
- **How**: `projects: ["./sdk/*/vite.config.ts", "./apps/*/vite.config.*"]`.
- **Why**:
  - **Vitest Glob Invariant**: Vitest matches files and directories in `test.projects`. If a bare glob like `"./sdk/*"` matches a standalone file like `sdk/mod.ts`, Vitest throws:
    `Startup Error: The projects glob matched a file "sdk/mod.ts", but it should also either start with "vitest.config"/"vite.config"`
  - Explicitly targeting config files (`*/vite.config.*`) guarantees Vitest only initializes packages configured for Vitest, leaving pure Deno packages (`sdk/core`, `sdk/api`) to `deno test`.
- **Evolution**:
  - *Phase 1*: Dynamic filesystem crawling with `discoverDirs()` in `_shared.ts`.
  - *Phase 2 (broken)*: Blind glob `projects: ["./sdk/*", "./apps/*"]`.
  - *Phase 3 (current)*: Config-targeted glob pattern.

### 5. `biome.json` & `fallowrc.json`
- **biome.json**: Pinned formatting and linting rules (2 spaces, double quotes, no semi). Runs in <20ms via `just fmt` and `just lint`.
- **fallowrc.json**: Unused dependency and dead-code detection configuration.
