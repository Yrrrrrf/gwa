---
name: vite-plus
description: >-
  Use this skill when developing, building, testing, linting, or managing monorepos with Vite+ (vp / vite-plus), VoidZero's unified Rust-accelerated web toolchain. Covers the unified vp CLI (dev, build, check, test, run, env, toolchain, pack), single-file vite.config.ts configuration, Rolldown bundler integration, tsdown library packaging, Vitest test execution, Oxlint and Oxfmt code quality pipelines, Vite Task monorepo caching and topological orchestration, and Deno interoperability shims. Reach for this skill whenever configuring Vite+, migrating from fragmented tooling (ESLint/Prettier/Turborepo), authoring library packages with tsdown, running multi-package workspace pipelines, or creating temporary shims for non-Node environments. Also use on errors like 'Cannot find module vite-plus', 'vp: command not found', 'Task failed in workspace member', 'Rolldown build error', or 'Oxlint syntax violation'.
metadata:
  package: vite-plus
  version: 0.1.0
  repo: voidzero-dev/vite-plus
  verified: 2026-08-20
  source_of_truth: VoidZero official specifications, viteplus.dev documentation, Vite 6/Rolldown/Oxc toolchain architecture
  upstream: https://viteplus.dev
---

# [[vite-plus]] [[skill]]

> [!abstract] Purpose
> Vite+ (`vp`) is a unified, zero-config web development toolchain created by VoidZero (Evan You) that consolidates the fragmented frontend ecosystem into a single dependency, a single global binary (`vp`), and a single configuration file (`vite.config.ts`). It deeply integrates Vite (dev server), Rolldown (Rust-native bundler), Oxc/Oxlint (Rust linter), Oxfmt (Rust formatter), Vitest (test runner), tsdown (library packager), Vite Task (caching monorepo task runner), and `vp env` (Node runtime manager).

## 📥 Inputs

- **Context:** Node.js `>=20.18` or `>=22.0` environment, TypeScript `>=5.0`, modern ESM (`"type": "module"` in `package.json`).
- **Constraints:** Requires a root `package.json` file. Vite+ leverages precompiled native Rust binaries (Rolldown, Oxc); non-Node runtimes (such as pure Deno setups without `package.json`) require a temporal execution shim.
- **Anti-use:** Not for legacy CommonJS-only runtimes without module support, not for non-JS/TS native binary compilation, and not for projects strictly constrained to zero-native-dependency JavaScript engines.

## 📤 Outputs

- **Result:** Native ESM development server, Rolldown production bundles, dual ESM/CJS `.d.ts` library packages via `tsdown`, Oxlint/Oxfmt diagnostics, Vitest test results, and cached workspace pipeline task outputs.
- **Side Effects:** Writes build artifacts to `dist/`, test artifacts to `coverage/`, cache metadata to `.vp/cache/` or `node_modules/.vite/`, and runtime pinning to `.node-version`.

## ⛓️ Workflow

```
                        ┌──────────────────────────────────────────────────────────┐
                        │                     vp CLI Entrypoint                    │
                        └────────────────────────────┬─────────────────────────────┘
                                                     │
         ┌──────────────┬──────────────┬─────────────┼─────────────┬──────────────┬──────────────┐
         ▼              ▼              ▼             ▼             ▼              ▼              ▼
     [vp dev]       [vp build]     [vp check]    [vp test]     [vp run]       [vp env]      [vp pack]
         │              │              │             │             │              │              │
    Vite Dev Server  Rolldown       Oxlint +      Vitest       Vite Task      Node Version    tsdown
    (Native ESM/HMR) (Rust Bundler) Oxfmt+Type    (Unit/E2E)   (Graph Cache)  Manager        (Libraries)
```

```bash
# 1. Global installation & project initialization
curl -fsSL https://vite.plus | bash
vp create my-app && cd my-app

# 2. Daily development loop
vp dev                # Start Vite dev server on http://localhost:5173
vp check --fix        # Run Oxlint + Oxfmt + Typecheck in a single pass
vp test --watch       # Run Vitest test runner
vp build              # Bundle with Rolldown for production
vp run build --filter # Execute cached workspace task graph
```

```ts
// vite.config.ts — Unified Single Configuration File
import { defineConfig } from 'vite-plus'

export default defineConfig({
  // Dev & Bundling (Vite + Rolldown)
  plugins: [],
  server: { port: 3000 },
  build: { target: 'esnext', sourcemap: true },

  // Quality Toolchain (Oxlint + Oxfmt)
  lint: { options: { typeCheck: true } },
  fmt: { singleQuote: true, semi: false },

  // Testing (Vitest)
  test: { globals: true, environment: 'happy-dom', include: ['src/**/*.test.ts'] },

  // Monorepo Task Orchestrator (Vite Task)
  run: {
    tasks: {
      build: { dependsOn: ['^build'], outputs: ['dist/**'] },
      test: { dependsOn: ['build'] }
    }
  }
})
```

---

## 🧭 Reference map

This skill is segmented by technical operational facets. Load only what your task requires:

| File | Load when |
| :--- | :--- |
| **This file** | **Always** — core mental model, invariants, gotchas, CLI quick reference |
| [workspaces.md](workspaces.md) | Monorepo architectures, multi-package repositories, topological task graphs (`vp run`), workspace overrides, `workspace:*` dependency resolution |
| [cli-and-toolchain.md](cli-and-toolchain.md) | Full `vp` CLI flag reference, `vp env` runtime pinning, package manager auto-detection, Deno compatibility shims |
| [config-and-build.md](config-and-build.md) | `vite.config.ts` schema, Vite dev server, Rolldown bundling, `tsdown` library packaging, SSR & plugins |
| [testing-and-quality.md](testing-and-quality.md) | Oxlint linter, Oxfmt formatter, Vitest test suite, typecheck pipelines, coverage & benchmarks |

---

## 📋 Core invariants

1. **Single Configuration Authority:** `vite.config.ts` is the single source of truth for all tools (Vite, Rolldown, Oxlint, Oxfmt, Vitest, Vite Task, tsdown). Standalone `.eslintrc`, `.prettierrc`, or `vitest.config.ts` files are obsolete and should be consolidated or removed.
2. **`package.json` Requirement:** Vite+ project roots and workspace members must contain a valid `package.json` with `"type": "module"`. Standalone `deno.json`-only projects require a temporal shim to establish package boundary semantics.
3. **Rust-Accelerated Performance Layer:** Oxlint, Oxfmt, and Rolldown run native Rust binaries compiled for the host OS/architecture. They operate 10x-50x faster than traditional JS implementations.
4. **Content-Hash Task Caching:** `vp run <task>` computes inputs from Git tree state, package dependencies, environment variables, and config hashes. Cached steps exit with zero redundant execution.
5. **Seamless Vitest Pipeline:** Testing runs directly on Vite's transformation pipeline, ensuring 100% resolution, plugin, and alias parity between development, testing, and production builds.
6. **Dual Export Packaging via `tsdown`:** Library mode bundles dual ESM (`.mjs`) and CommonJS (`.cjs`) output with automatically generated TypeScript declaration maps (`.d.ts`), resolving subpath exports cleanly.
7. **Workspace Member Isolation & Inheritance:** Workspace packages inherit base root configurations while selectively applying overrides via the `overrides` block in root `vite.config.ts` or local configs.
8. **Deterministic Runtime Pinning:** `vp env` enforces Node.js versions specified in `.node-version` or `package.json#engines`, preventing local environment drift across teams.
9. **`workspace:*` Resolution Integrity:** Inter-package workspace dependencies resolve directly to source code or built outputs depending on exports mapping without requiring intermediate npm registry publishing.
10. **Zero-Fluff CLI Diagnostics:** `vp check` combines syntax parsing, lint diagnostics, format mismatches, and TypeScript compiler errors into a unified terminal reporter.

---

## ⚠️ Gotchas

**Installation & Environment**
- ❌ `bash: vp: command not found`
  - **Cause:** The global Vite+ bin directory (`~/.vite-plus/bin` or `~/.local/bin`) is not in `$PATH`.
  - **Fix:** Add `export PATH="$HOME/.vite-plus/bin:$PATH"` to `~/.bashrc` or `~/.zshrc`, or invoke locally via `npx vite-plus` / `pnpm vp`.
- ❌ `Error: Cannot find module 'vite-plus'`
  - **Cause:** `vite-plus` is installed globally via `vp` but missing from local project `package.json#devDependencies`.
  - **Fix:** Run `vp install -D vite-plus` (or `pnpm add -D vite-plus`) in the project root.

**Monorepo & Workspaces**
- ❌ `Error: Member 'packages/core' specified in workspace does not contain a package.json`
  - **Cause:** Directory listed in `pnpm-workspace.yaml` or `package.json#workspaces` is missing `package.json`.
  - **Fix:** Add a minimal `package.json` (`{ "name": "@scope/core", "type": "module", "version": "0.1.0" }`) to the member folder.
- ❌ `TypeError: Cannot resolve module 'workspace:@scope/shared'`
  - **Cause:** Target workspace member lacks an `"exports"` field in its `package.json`, or the consumer is running without workspace awareness.
  - **Fix:** Add explicit `"exports": { ".": "./src/index.ts" }` to `@scope/shared/package.json`.

**Linting, Formatting & Quality**
- ❌ `OxlintError: ESLint plugin 'custom-rule' is not supported natively in Rust`
  - **Cause:** Oxlint supports high-performance built-in rules, typescript-eslint, react, unicorn, and import rules, but custom JS-based plugins cannot run in native Rust.
  - **Fix:** Use Oxlint's ESLint fallback bridge mode or replace custom rule logic with standard Oxlint categories.

---

## 📝 Cheat sheet

```bash
# ── CLI COMMAND MATRIX ────────────────────────────────────────────────
vp dev                  # Start native ESM dev server (:5173)
vp dev --port 3000      # Start dev server on custom port
vp build                # Build production bundle with Rolldown
vp build --watch        # Build in watch mode
vp check                # Run Oxlint + Oxfmt + Typecheck in unified pass
vp check --fix          # Automatically fix lint and format issues
vp test                 # Run Vitest test suite
vp test --ui            # Open Vitest interactive UI dashboard
vp test --coverage      # Run tests with V8/Istanbul coverage collection
vp run build            # Run workspace build task with dependency DAG & caching
vp run test --filter ui # Run task restricted to specific workspace member
vp env use 22.12.0      # Pin and activate specific Node.js runtime version
vp toolchain            # Print installed versions of Vite, Rolldown, Oxc, Vitest
vp pack                 # Package library using tsdown (generates ESM/CJS/DTS)

# ── CONFIGURATION CHEAT SHEET (vite.config.ts) ────────────────────────
import { defineConfig } from 'vite-plus'

export default defineConfig({
  lint: {
    categories: { correctness: 'error', suspicious: 'warn', perf: 'warn' },
    options: { typeCheck: true }
  },
  fmt: {
    singleQuote: true,
    semi: false,
    printWidth: 100
  },
  test: {
    globals: true,
    environment: 'node',
    coverage: { provider: 'v8', reporter: ['text', 'json', 'html'] }
  },
  run: {
    tasks: {
      build: { dependsOn: ['^build'], outputs: ['dist/**'] },
      test: { dependsOn: ['build'] }
    }
  }
})
```

---

## Connections

- Uses [[ts]]
- Integrates with [[deno]] via shims
- Validated against VoidZero unified toolchain specifications
- Uses [[ai-skills|AI Skills Index]]

## 🔄 Provenance

- Pinned to **Vite+ (`vite-plus@0.1.0`)**, Vite 6+, Rolldown (Rust engine), Oxc/Oxlint/Oxfmt, Vitest 2+, tsdown, and Vite Task.
- Verified: 2026-08-20.
- Source of truth: VoidZero toolchain RFCs, `viteplus.dev` official architecture guide, Rolldown GitHub repository (`voidzero-dev/rolldown`), and Oxc project repository (`oxc-project/oxc`).
- To refresh: Validate against newer releases on `https://github.com/voidzero-dev/vite-plus` and diff CLI flags and config schemas.
