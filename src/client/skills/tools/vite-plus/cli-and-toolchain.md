# [[vite-plus]] [[cli-and-toolchain]]

> [!abstract] Purpose
> Complete technical reference for the `vp` CLI commands, flags, Node.js runtime manager (`vp env`), package manager abstraction layer, CI workflows, and Deno interoperability temporal execution shims.

## ⚡ CLI & Toolchain Reference

### 1. Global `vp` Command Matrix

| Command | Subcommands / Primary Flags | Purpose & Execution Flow |
| :--- | :--- | :--- |
| `vp dev` | `[root] [--port <n>] [--host] [--open] [--cors]` | Starts Vite native ESM dev server with HMR |
| `vp build` | `[root] [--target <t>] [--outDir <d>] [--sourcemap] [--watch] [--ssr]` | Compiles production bundle using Rolldown |
| `vp check` | `[path] [--fix] [--typecheck] [--staged] [--verbose]` | High-speed Oxlint + Oxfmt + TS typecheck pass |
| `vp test` | `[filter] [--run] [--watch] [--ui] [--coverage] [--reporter <r>]` | Executes Vitest test suite within Vite context |
| `vp run` | `<task> [--filter <f>] [--parallel] [--force] [--since <ref>]` | Executes monorepo task graph with content caching |
| `vp env` | `use <ver> \| install <ver> \| list \| pin` | Manages and pins Node.js runtime versions |
| `vp toolchain` | `[--json] [--check-updates]` | Displays bundled toolchain versions (Vite, Rolldown, Oxc, etc.) |
| `vp pack` | `[--dts] [--formats es,cjs] [--bundleless] [--watch]` | Packages libraries via tsdown with dual exports |
| `vp exec` | `<cmd> [...args]` | Runs binary/script in the `vp`-managed environment |
| `vp install` | `[--frozen-lockfile] [-D <pkg>]` | Proxies to active package manager (pnpm/npm/yarn/bun) |
| `vp add` | `<pkg> [-D] [--workspace]` | Installs package into project or workspace member |
| `vp rm` | `<pkg>` | Removes package from dependencies |
| `vp create` | `<template> [dir]` | Scaffolds new projects from official VoidZero templates |
| `vp migrate` | `[--from eslint\|prettier\|turborepo]` | Automated migration tool to consolidate configs into `vite.config.ts` |

---

### 2. Detailed CLI Flags & Recipes

```bash
# ── DEV SERVER ────────────────────────────────────────────────────────
vp dev                          # Default on port 5173
vp dev --port 3000 --host 0.0.0.0  # Expose to local network
vp dev --open                   # Automatically launch default browser
vp dev --cors                   # Enable permissive CORS headers

# ── PRODUCTION BUILD (Rolldown) ───────────────────────────────────────
vp build                        # Production build outputting to dist/
vp build --sourcemap            # Generate source maps
vp build --target es2022        # Set target JS runtime bytecode
vp build --ssr src/entry-ssr.ts # Build server-side rendering bundle

# ── QUALITY & CODE HEALTH (Oxlint + Oxfmt) ────────────────────────────
vp check                        # Run linter + formatter check (read-only)
vp check --fix                  # Auto-fix lint violations and reformat files
vp check --staged               # Run check only on Git staged files (pre-commit)
vp check --typecheck            # Enforce full TypeScript type checking via Oxc/tsc

# ── TESTING (Vitest) ──────────────────────────────────────────────────
vp test                         # Run in watch mode during development
vp test --run                   # Single-pass execution for CI/CD
vp test --ui                    # Launch interactive browser UI at :51204
vp test --coverage              # Collect test coverage via V8 engine
vp test auth.test.ts            # Run only tests matching filename filter

# ── TASK RUNNER & MONOREPO ────────────────────────────────────────────
vp run build                    # Execute topological build task across workspace
vp run build --filter "@scope/web" # Target single package + its dependencies
vp run test --since origin/main # Run tests only on packages changed vs main
vp run check --force            # Bypass .vp/cache and force full re-run
```

---

### 3. Node.js Runtime Manager (`vp env`)

`vp env` operates as a built-in zero-latency version manager replacing `nvm`, `fnm`, `asdf`, and `volta`.

```bash
# List available and installed Node runtimes
vp env list

# Install and switch active Node version
vp env install 22.12.0
vp env use 22.12.0

# Pin version in current project directory (writes to .node-version)
vp env pin 22.12.0
```

#### `.node-version` Resolution Precedence:
1. `VP_NODE_VERSION` environment variable.
2. `.node-version` file in current or parent directories.
3. `.nvmrc` file in current or parent directories.
4. `"engines": { "node": ">=22.0.0" }` in `package.json`.
5. Global fallback pinned in `~/.vite-plus/config.json`.

---

### 4. Package Manager Proxy Layer

Vite+ detects the appropriate package manager by inspecting root lockfiles:

| Lockfile Present | Detected Manager | `vp install` Proxied Execution |
| :--- | :--- | :--- |
| `pnpm-lock.yaml` | `pnpm` | `pnpm install` |
| `package-lock.json` | `npm` | `npm install` |
| `yarn.lock` | `yarn` | `yarn install` |
| `bun.lockb` / `bun.lock` | `bun` | `bun install` |
| *(None found)* | `pnpm` (default) | `pnpm install` |

---

### 5. Deno Interoperability & Temporal Shims

Vite+ requires a `package.json` file and Node runtime semantics. When working in a Deno-centric project or repository, Vite+ commands cannot read `deno.json` directly. Use these production-grade temporal shims to bridge the environment.

#### A. Synthetic `package.json` Generator & Bridge (`shim-vp-deno.sh`)

```bash
#!/usr/bin/env bash
# shim-vp-deno.sh — Temporal execution shim for running Vite+ in Deno projects
set -euo pipefail

SYNTH_CREATED=0

# Step 1: Synthesize temporary package.json if only deno.json exists
if [ ! -f "package.json" ] && [ -f "deno.json" ]; then
  echo "[vite-plus-shim] Generating ephemeral package.json from deno.json..."
  cat << 'EOF' > package.json
{
  "name": "deno-vite-plus-shim",
  "type": "module",
  "private": true,
  "devDependencies": {
    "vite-plus": "^0.1.0"
  }
}
EOF
  SYNTH_CREATED=1
fi

# Cleanup handler on exit
cleanup() {
  if [ "$SYNTH_CREATED" -eq 1 ]; then
    echo "[vite-plus-shim] Cleaning up ephemeral package.json..."
    rm -f package.json
  fi
}
trap cleanup EXIT

# Step 2: Execute requested vp command via npx or global vp
if command -v vp >/dev/null 2>&1; then
  vp "$@"
elif command -v deno >/dev/null 2>&1; then
  # Direct invocation through Deno's npm specifier bridge
  deno run -A npm:vite-plus "$@"
else
  npx vite-plus "$@"
fi
```

#### B. Direct `deno.json` Task Integration

```jsonc
// deno.json
{
  "tasks": {
    // Invoke Vite+ dev server via temporal npm execution
    "dev": "./shim-vp-deno.sh dev",
    // Run production build
    "build": "./shim-vp-deno.sh build",
    // Run Oxlint and Oxfmt diagnostics
    "check": "./shim-vp-deno.sh check",
    // Run Vitest suite
    "test": "./shim-vp-deno.sh test"
  },
  "nodeModulesDir": "auto"
}
```

---

### 6. CI/CD Pipeline Automation (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  pipeline:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9

      # Install global Vite+ CLI
      - name: Install Vite+
        run: curl -fsSL https://vite.plus | bash

      # Add vp to GitHub path
      - name: Setup Path
        run: echo "$HOME/.vite-plus/bin" >> $GITHUB_PATH

      # Set Node version via vp env
      - name: Setup Node Runtime
        run: vp env use 22.12.0

      # Install dependencies with frozen lockfile
      - name: Install Dependencies
        run: vp install --frozen-lockfile

      # Unified Quality Pass (Oxlint + Oxfmt + Typecheck)
      - name: Code Quality Check
        run: vp check --typecheck

      # Unit & Integration Tests with Vitest
      - name: Run Tests
        run: vp test --run --coverage

      # Build workspace task graph with cache
      - name: Build Workspace
        run: vp run build
```

---

## 📋 Rules & Invariants

1. **Subprocess Delegation Model:** When `vp install` or `vp add` runs, arguments are delegated verbatim to the underlying package manager binary after setting active environment variables.
2. **Environment Variable Injection:** `vp` automatically loads `.env`, `.env.local`, and `.env.[mode]` files before executing any toolchain subsystem.
3. **Deterministic Exit Codes:**
   - Exit code `0`: Successful completion.
   - Exit code `1`: Lint/format/typecheck or test assertion failure.
   - Exit code `2`: Toolchain compilation or runtime crash.
4. **Isolated Global Cache:** All global binaries, Node.js runtime tarballs, and Oxc artifacts are isolated in `~/.vite-plus/` to prevent contamination with user-global `node_modules`.
5. **Signal Forwarding:** `vp` captures `SIGINT` (Ctrl+C) and `SIGTERM`, gracefully propagating cancellation signals to all child tasks and dev servers before closing.

---

## ⚠️ Gotchas & Fixes

**CLI Invocation & Environment**
- ❌ `Error: Node.js version 18.14.0 is unsupported. Vite+ requires Node.js >=20.18.0 or >=22.0.0`
  - **Cause:** Active shell is using an outdated Node.js runtime.
  - **Fix:** Run `vp env use 22` or `vp env install 22` to switch to a supported LTS release.
- ❌ `vp: command not found: vp`
  - **Cause:** Script or shell environment running without `~/.vite-plus/bin` in `$PATH`.
  - **Fix:** In CI or non-interactive shells, source the environment: `export PATH="$HOME/.vite-plus/bin:$PATH"`.

**Deno Compatibility & Interop**
- ❌ `Error: No package.json found in current directory. Vite+ requires a package.json file.`
  - **Cause:** Attempting to run `vp dev` or `vp build` in a pure Deno repository without `package.json`.
  - **Fix:** Use the `shim-vp-deno.sh` wrapper above to generate an ephemeral `package.json`, or add a permanent `{ "type": "module" }` `package.json`.
- ❌ `error: Uncaught (in promise) Error: Cannot find module 'npm:vite-plus'`
  - **Cause:** Deno invoked without internet access or with npm specifiers disabled.
  - **Fix:** Ensure Deno has network access on initial run or pre-fetch dependencies via `deno cache npm:vite-plus`.

**Toolchain Version Mismatch**
- ❌ `Error: Incompatible Rolldown native binary found for linux-x64-gnu`
  - **Cause:** Corrupted cache in `~/.vite-plus` or architecture mismatch (e.g. running x64 binary on arm64 container).
  - **Fix:** Run `vp toolchain --reinstall` or purge `rm -rf ~/.vite-plus/tools` and re-run.
