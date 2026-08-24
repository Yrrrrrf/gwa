# [[deno]] [[workspaces]] [[package-json]]

> [!abstract] Purpose
> Complete technical reference for Deno 2 monorepo workspaces, package.json interoperability, configuration key equivalence, cross-package dependency resolution, and migration from npm/pnpm/yarn.

## ⚡ Configuration & Equivalence Reference

### `package.json` vs `deno.json` Field-by-Field Equivalence

| `package.json` Field | `deno.json` / `deno.jsonc` Equivalence | Behavior / Notes in Deno 2 |
| :--- | :--- | :--- |
| `"name"` | `"name": "@scope/pkg"` | JSR or npm package name identifier |
| `"version"` | `"version": "1.2.3"` | Semver release version |
| `"scripts"` | `"tasks": { "dev": "deno run -A main.ts" }` | Executed via `deno task <name>`; supports shell operators (`&&`, `\|`, `>`, `cross-env`) |
| `"dependencies"` | `"imports": { "pkg": "npm:pkg@^1.0" }` | Resolved via import maps (`npm:`, `jsr:`, `https://`, or local `./`) |
| `"devDependencies"` | `"imports"` (or member-scoped imports) | Deno does not separate runtime vs dev dependencies in `deno.json` |
| `"workspaces"` | `"workspace": ["./packages/*", "./apps/*"]` | Defines monorepo member paths; automatically resolves member package names |
| `"main"` / `"module"` | `"exports": "./src/mod.ts"` or `"exports": { ".": "./src/mod.ts" }` | Modern export mapping for entrypoints; supports subpath exports |
| `"type": "module"` | *(Default in Deno)* | All files treated as ES modules by default; `.cjs` supported for CommonJS |
| `"exports"` | `"exports": { ".": "./mod.ts", "./sub": "./sub.ts" }` | Full export subpath routing support |
| `"publishConfig"` | `"publish": { "include": ["src/", "README.md"], "exclude": ["tests/"] }` | Filter files published to JSR / npm |
| `"bin"` | *(Defined via `tasks` or `exports`)* | Executable entry points |
| `tsconfig.json` | `"compilerOptions": { "jsx": "react-jsx", "strict": true }` | Inlined directly into `deno.json`; eliminates separate `tsconfig.json` |

---

### Root Monorepo `deno.json` Setup

```jsonc
// /deno.json
{
  "workspace": [
    "./packages/core",
    "./packages/ui",
    "./apps/web",
    "./apps/api"
  ],
  "tasks": {
    "check": "deno check **/*.ts",
    "test": "deno test -A --parallel",
    "fmt": "deno fmt --check",
    "lint": "deno lint",
    "dev:web": "deno task --cwd apps/web dev",
    "dev:api": "deno task --cwd apps/api dev"
  },
  "imports": {
    "@std/assert": "jsr:@std/assert@^1.0.8",
    "@std/http": "jsr:@std/http@^1.0.12"
  },
  "lint": {
    "rules": {
      "tags": ["recommended"]
    }
  },
  "fmt": {
    "semiColons": true,
    "singleQuote": true,
    "lineWidth": 100
  }
}
```

---

### Member Package Configurations

```jsonc
// /packages/core/deno.json
{
  "name": "@myorg/core",
  "version": "1.0.0",
  "exports": {
    ".": "./src/index.ts",
    "./utils": "./src/utils.ts"
  },
  "tasks": {
    "test": "deno test src/"
  }
}
```

```jsonc
// /apps/web/deno.json
{
  "name": "web-app",
  "tasks": {
    "dev": "deno run -A --watch src/main.ts",
    "build": "deno compile --output dist/web src/main.ts"
  },
  "imports": {
    "@myorg/core": "workspace:@myorg/core",
    "hono": "npm:hono@^4.6.14"
  }
}
```

---

### Monorepo Task Orchestration Matrix

| Command | Target Scope | Execution Behavior |
| :--- | :--- | :--- |
| `deno task <name>` | Root workspace | Executes task defined in root `deno.json` |
| `deno task --cwd <dir> <name>` | Specific member directory | Executes task within target package context |
| `deno task --recursive <name>` | All workspace members | Runs `<name>` across every member package defining that task |
| `deno test --doc` | All workspace members | Runs documentation tests across entire workspace |
| `deno check --workspace` | All workspace members | Type-checks all workspace members simultaneously |
| `deno fmt --workspace` | All workspace members | Formats all files matching workspace member rules |
| `deno publish` | Root or member | Publishes eligible workspace member packages to JSR |

---

### Node.js Monorepo (`package.json` + `pnpm-workspace.yaml`) Direct Execution in Deno 2

Deno 2 supports reading `package.json` natively without converting to `deno.json`:

```json
// package.json (Auto-discovered by Deno 2)
{
  "name": "node-compat-monorepo",
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "start": "node index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "express": "^4.21.2",
    "zod": "^3.24.1"
  }
}
```

```bash
# Directly run package.json scripts with Deno
deno task start
deno test
deno install   # Populates lockfile and resolves npm dependencies
```

---

## 📋 Rules & Invariants

1. **Workspace member discovery requires either `deno.json` or `package.json`.** A directory listed in `"workspace"` that contains neither file is rejected with an error during resolution.
2. **`workspace:` specifiers resolve locally without network calls.** `"@scope/pkg": "workspace:@scope/pkg"` or `"workspace:*"` links directly to the member's exported entry point defined in its `exports` field.
3. **Root `compilerOptions` are inherited by all workspace members.** Member `deno.json` files can override individual keys, but base rules (e.g. `jsx: "react-jsx"`) cascade downward.
4. **Unified `deno.lock` at workspace root.** Deno writes a single dependency graph lockfile at the workspace root covering all members, preventing version fragmentation across packages.
5. **Precedence order: `deno.json` > `package.json`.** When both exist in the same directory, Deno reads configuration (tasks, imports, exports) from `deno.json` while honoring `package.json` dependencies unless explicitly overridden.
6. **Task shell execution is built-in.** `deno task` contains its own cross-platform shell interpreter: `VAR=value`, `&&`, `||`, `;`, `|`, and `>` work identical on Windows, macOS, and Linux without `sh` or `cross-env`.
7. **No automatic `npm run` fallback inside `deno task`.** If a script references `npm run other-task`, replace with `deno task other-task` or alias in `tasks`.

---

## ⚠️ Gotchas & Fixes

**Workspace Resolution**

- ❌ `error: Member 'packages/foo' specified in workspace does not contain a deno.json or package.json file`
  - **Cause:** Listed glob or path in `"workspace"` matches an empty or unconfigured directory.
  - **Fix:** Add a minimal `deno.json` (`{ "name": "@myorg/foo", "version": "0.1.0" }`) to `packages/foo` or narrow the `"workspace"` glob.

- ❌ `error: Task 'test' not found in workspace member`
  - **Cause:** Running `deno task --recursive test` when some members do not define a `"test"` task.
  - **Fix:** Define an empty or passing task `"test": "true"` in members lacking tests, or target specific packages with `deno task --cwd packages/target test`.

- ❌ `TypeError: Cannot resolve module 'workspace:@myorg/core'`
  - **Cause:** Standalone file execution outside workspace context, or the target member is missing `"exports"` in its `deno.json`.
  - **Fix:** Ensure `@myorg/core/deno.json` has `"exports": "./mod.ts"` and run from the workspace root or pass `--config /path/to/root/deno.json`.

**package.json Interop**

- ❌ `error: package.json dependencies not found in deno.lock`
  - **Cause:** Running in `--frozen` mode in CI without running `deno install` after modifying `package.json`.
  - **Fix:** Run `deno install` locally to update `deno.lock`, commit the lockfile, then re-run CI.

- ❌ `error: Cannot find module '@scope/package' imported from 'src/index.ts'`
  - **Cause:** Attempting bare specifier import without defining it in `package.json` dependencies or `deno.json` imports.
  - **Fix:** Run `deno add npm:@scope/package` or add `"@scope/package": "npm:@scope/package@^1.0.0"` to `"imports"`.
