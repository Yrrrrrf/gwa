# [[vite-plus]] [[workspaces]]

> [!abstract] Purpose
> Complete technical reference for Vite+ monorepos, multi-package workspaces, Vite Task orchestration, content-hash caching, workspace dependency resolution (`workspace:*`), and unified configuration overrides.

## ⚡ Workspaces & Monorepo Reference

### 1. Monorepo Directory Architecture

```
monorepo-root/
├── pnpm-workspace.yaml         # Workspace member globs
├── package.json                # Root package with "type": "module"
├── vite.config.ts              # Unified root config with workspace tasks & overrides
├── .node-version               # Pinned Node.js runtime for vp env
├── apps/
│   ├── web/                    # Frontend application
│   │   ├── package.json        # "dependencies": { "@scope/ui": "workspace:*" }
│   │   ├── vite.config.ts      # (Optional) App-specific overrides
│   │   └── src/main.tsx
│   └── api/                    # Backend service / SSR server
│       ├── package.json
│       └── src/index.ts
└── packages/
    ├── ui/                     # Shared UI component library
    │   ├── package.json        # Dual exports (ESM/CJS)
    │   └── src/index.ts
    └── utils/                  # Core utilities library
        ├── package.json
        └── src/index.ts
```

---

### 2. Workspace Definition Files

```yaml
# pnpm-workspace.yaml (Recommended)
packages:
  - 'apps/*'
  - 'packages/*'
```

```json
// Root package.json (Alternative for npm/yarn)
{
  "name": "monorepo-root",
  "private": true,
  "type": "module",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "devDependencies": {
    "vite-plus": "^0.1.0"
  }
}
```

---

### 3. Unified Root `vite.config.ts` with Vite Task & Overrides

```ts
// /vite.config.ts
import { defineConfig } from 'vite-plus'

export default defineConfig({
  // Global Quality Defaults for all members
  lint: {
    categories: { correctness: 'error', suspicious: 'warn' },
    options: { typeCheck: true }
  },
  fmt: {
    singleQuote: true,
    semi: false,
    printWidth: 100
  },

  // Vite Task Monorepo Orchestration Engine
  run: {
    // Shared environment variables that invalidate all task caches
    env: ['NODE_ENV', 'CI'],
    tasks: {
      // Topological build: dependsOn "^build" builds upstream dependencies first
      build: {
        command: 'vp build',
        dependsOn: ['^build'],
        inputs: ['src/**', 'tsconfig.json', 'package.json'],
        outputs: ['dist/**'],
        cache: true
      },
      // Typecheck across all workspace packages
      check: {
        command: 'vp check',
        dependsOn: ['^build'],
        cache: true
      },
      // Unit & integration tests
      test: {
        command: 'vp test --run',
        dependsOn: ['build'],
        inputs: ['src/**', 'tests/**', 'vitest.config.ts'],
        outputs: ['coverage/**'],
        cache: true
      },
      // Dev task (long-running, never cached)
      dev: {
        command: 'vp dev',
        dependsOn: ['^build'],
        cache: false,
        persistent: true
      }
    }
  },

  // Package-Specific Configuration Overrides
  overrides: {
    'packages/*': {
      build: {
        // Automatically package workspace libraries via tsdown
        lib: {
          entry: 'src/index.ts',
          formats: ['es', 'cjs'],
          dts: true
        }
      }
    },
    'apps/web': {
      server: { port: 3000 }
    },
    'apps/api': {
      server: { port: 4000 }
    }
  }
})
```

---

### 4. Workspace Member `package.json` Specifications

```json
// /packages/ui/package.json
{
  "name": "@scope/ui",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./styles.css": "./dist/styles.css"
  },
  "scripts": {
    "build": "vp pack",
    "dev": "vp pack --watch"
  },
  "dependencies": {
    "@scope/utils": "workspace:*"
  },
  "devDependencies": {
    "vite-plus": "workspace:*"
  }
}
```

```json
// /apps/web/package.json
{
  "name": "@scope/web",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vp dev",
    "build": "vp build",
    "preview": "vp preview"
  },
  "dependencies": {
    "@scope/ui": "workspace:*",
    "@scope/utils": "workspace:*",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

---

### 5. Monorepo Task Execution Matrix (`vp run`)

| Command | Scope | Cache Behavior | Execution Graph |
| :--- | :--- | :--- | :--- |
| `vp run build` | All workspace members | Uses cached output if inputs match | Topological order (dependencies first) |
| `vp run build --filter @scope/web` | `@scope/web` + dependencies | Upstream deps checked for cache hit | Topological DAG up to `@scope/web` |
| `vp run test --filter "packages/*"` | All matching packages in glob | Cached per package | Parallel execution across packages |
| `vp run check --since HEAD~1` | Packages modified since Git ref | Computes diff against Git commit | Only affected package subtrees |
| `vp run build --force` | Entire workspace | Ignores cache, rebuilds all | Re-computes and overwrites `.vp/cache` |
| `vp run dev --filter @scope/web` | Single application | Long-running process (no cache) | Builds dependency packages first |
| `vp check --workspace` | All workspace members | Parallel lint + format + typecheck | Single unified diagnostic reporter |
| `vp test --workspace` | All workspace members | Runs Vitest across entire workspace | Shared test runner process |

---

### 6. Inter-Package Protocol Comparison

| Protocol | Example in `package.json` | Resolution in Development | Resolution on Publish (`vp pack`) |
| :--- | :--- | :--- | :--- |
| `workspace:*` | `"@scope/ui": "workspace:*"` | Symlinked directly to member folder | Replaced with exact local version (`1.0.0`) |
| `workspace:^` | `"@scope/ui": "workspace:^"` | Symlinked directly to member folder | Replaced with caret range (`^1.0.0`) |
| `workspace:~` | `"@scope/ui": "workspace:~"` | Symlinked directly to member folder | Replaced with tilde range (`~1.0.0`) |
| Semver direct | `"@scope/ui": "^1.0.0"` | Resolved via workspace member if version matches | Kept as declared |

---

## 📋 Rules & Invariants

1. **Topological Order Execution:** When `dependsOn: ['^build']` is set, upstream workspace dependencies are guaranteed to finish before downstream consumers start.
2. **Explicit Member `exports` Mapping:** Workspace members must specify valid `"exports"` fields. Vite+ resolves internal workspace packages using modern Node export maps; omitting `"exports"` causes resolution failures.
3. **Content Hash Determinism:** Cache keys are calculated from:
   $$\text{Key} = \text{Hash}(\text{Source Files} + \text{Config} + \text{Env Vars} + \text{Dependency Tree Hashes})$$
4. **Isolated Member Overrides:** Root `vite.config.ts#overrides` match by glob pattern. If a member contains its own local `vite.config.ts`, local settings take precedence over root overrides.
5. **No Phantom Dependencies:** Workspace members cannot import packages declared only in the monorepo root `package.json` unless those packages are explicitly declared in the member's own `package.json`.
6. **Unified Lockfile Anchor:** A single `pnpm-lock.yaml`, `package-lock.json`, or `yarn.lock` must reside at the monorepo root. Never generate nested lockfiles inside individual package folders.
7. **Zero-Bundle Dev Linking:** In `vp dev`, Vite resolves `workspace:*` packages directly to their source files if configured with source export aliases, eliminating the need to run build watchers for local development.
8. **Persistent Task Exclusions:** Tasks marked with `persistent: true` (e.g. `vp dev`) cannot be dependents of batch tasks (e.g. `vp run build`).

---

## ⚠️ Gotchas & Fixes

**Task Runner & Caching**
- ❌ `Error: Cycle detected in task dependency graph: @scope/ui -> @scope/utils -> @scope/ui`
  - **Cause:** Circular dependency between workspace members or mutual `dependsOn` declarations.
  - **Fix:** Refactor shared logic into a leaf package (e.g. `@scope/core`) and ensure `dependsOn` flows in a Directed Acyclic Graph (DAG).
- ❌ `Warning: Cache miss for task 'build' in '@scope/web': Environment variable 'API_URL' changed`
  - **Cause:** Uncached global environment variables fluctuating between local runs and CI.
  - **Fix:** Declare specific env vars in `run.tasks.build.env: ['API_URL']` or normalize `.env` loading.

**Workspace Resolution & Linking**
- ❌ `TypeError: Cannot resolve module '@scope/ui' from 'apps/web/src/App.tsx'`
  - **Cause:** `@scope/ui` is listed as `"workspace:*"` in `apps/web/package.json` but has not executed `vp pack` to populate `dist/index.js`, and lacks a `"development"` export condition.
  - **Fix:** Add a development export condition pointing to source:
    ```json
    "exports": {
      ".": {
        "development": "./src/index.ts",
        "default": "./dist/index.js"
      }
    }
    ```
- ❌ `Error: Target package '@scope/legacy' not found in workspace`
  - **Cause:** Folder name does not match the glob in `pnpm-workspace.yaml` or `"name"` in `package.json`.
  - **Fix:** Verify `pnpm-workspace.yaml` contains `'packages/*'` and the package's `package.json` defines `"name": "@scope/legacy"`.

**Execution Scope**
- ❌ `Error: Filter string '@scope/*' did not match any workspace packages`
  - **Cause:** Syntax mismatch in the filter flag.
  - **Fix:** Use quotes around globs: `vp run build --filter "@scope/*"` or pass the exact package name `vp run build --filter @scope/ui`.
