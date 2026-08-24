---
name: deno
description: >-
  Use this skill when developing, testing, configuring, or debugging applications with the Deno 2 runtime and toolchain. Covers full package.json & workspaces monorepo equivalence, npm/node interop (npm:, node:*, node_modules strategies, lifecycle scripts), unified toolchain (run, task, test, bench, fmt, lint, check, compile standalone binaries, publish), granular security permissions sandbox (--allow-*, --deny-*, runtime Deno.permissions API), JSR package registry & @std/* standard library imports, and native runtime APIs (Deno.serve HTTP/WebSocket server, Deno.openKv ACID key-value store, Deno.cron, Deno.Command subprocesses, Deno.dlopen FFI). Reach for this whenever migrating Node projects, building microservices, configuring monorepos, compiling single-file binaries, or publishing to JSR. Also use when debugging NotCapable permission errors, npm lifecycle script failures, or workspace resolution issues.
metadata:
  repo: denoland/deno
  version: 2.2.0
  verified: 2026-08-20
  source_of_truth: official docs, Deno 2 CLI specification, and runtime APIs
  upstream: https://docs.deno.com/
---

# [[deno]] [[skill]]

> [!abstract] Purpose
> Core entry point for Deno 2. Secure-by-default TypeScript/JavaScript runtime with native package.json and workspaces compatibility, built-in toolchain (run, task, test, bench, fmt, lint, check, compile, publish), npm/JSR registry integration, Deno KV database, Deno.serve HTTP engine, and granular capability permissions.

## 📥 Inputs

- **Context:** Deno ≥ 2.0 (targets Deno 2.2+); TypeScript, JavaScript, JSX/TSX, WebAssembly.
- **Constraints:** Secure sandbox enabled by default (requires explicit `--allow-*` flags or interactive approval); ES modules first; native Web Standards APIs (`fetch`, `Request`, `Response`, `WebSocket`, `Web Crypto`).
- **Anti-use:** Not for legacy Node.js environments lacking Deno runtime binary; not for pure browser DOM scripts without runtime bundling.

## 📤 Outputs

- **Result:** Executed scripts, compiled standalone single-file executables, benchmark and test reports, formatted/linted codebases, or published JSR packages.
- **Side Effects:** Centralized module cache in `$DENO_DIR`, optional local `node_modules` directory, and `deno.lock` integrity lockfile.

## ⛓️ Workflow

```jsonc
// deno.json
{
  "name": "@myorg/api",
  "version": "1.0.0",
  "tasks": {
    "dev": "deno run --allow-net --allow-read --watch src/main.ts",
    "test": "deno test -A",
    "build": "deno compile -A --output dist/server src/main.ts"
  },
  "imports": {
    "@std/assert": "jsr:@std/assert@^1.0.8",
    "@std/http": "jsr:@std/http@^1.0.12",
    "hono": "npm:hono@^4.6.14"
  }
}
```

```ts
// src/main.ts
import { Hono } from 'hono'

const app = new Hono()
const kv = await Deno.openKv()

app.get('/', async (c) => {
  const countKey = ['visits']
  const res = await kv.atomic().sum(countKey, 1n).commit()
  const entry = await kv.get<bigint>(countKey)
  return c.json({ status: 'ok', visits: entry.value?.toString() ?? '1' })
})

Deno.serve({ port: 8000 }, app.fetch)
```

---

## 🧭 Reference map

| File | Load when |
| :--- | :--- |
| **This file** | always — mental model, core runtime workflow, invariants, gotchas, cheat sheet |
| [workspaces-and-package-json.md](workspaces-and-package-json.md) | Monorepo configuration, `workspace: [...]`, `package.json` vs `deno.json` key equivalence, migration |
| [node-npm-interop.md](node-npm-interop.md) | `npm:` imports, `node:*` built-ins, `node_modules` directory strategies (`auto`/`manual`/`none`), CJS/ESM |
| [cli-toolchain.md](cli-toolchain.md) | CLI commands (`run`, `task`, `test`, `bench`, `fmt`, `lint`, `check`, `compile`, `publish`), compiler options |
| [permissions-security.md](permissions-security.md) | Security sandbox flags (`--allow-*`, `--deny-*`), runtime `Deno.permissions`, Web Worker isolation |
| [jsr-std-and-imports.md](jsr-std-and-imports.md) | `@std/*` library catalog, JSR package publishing, slow-types rules, import maps & scopes |
| [runtime-apis.md](runtime-apis.md) | `Deno.serve` HTTP/WebSockets, `Deno.openKv` ACID transactions, `Deno.cron`, `Deno.Command`, FFI |

---

## 📋 Core invariants

1. **Deno 2 executes `package.json` natively.** If no `deno.json` is found, Deno reads dependencies, scripts, and workspaces directly from `package.json`.
2. **TypeScript & JSX require zero configuration.** TS type checking, stripping, and JSX compilation are built-in without Babel, Webpack, or external `tsc`.
3. **Explicit file extensions or URL schemes are required in source code:** Relative imports must include `.ts`, `.js`, `.tsx`, `.jsx`, or be remapped in `imports`.
4. **Security sandbox defaults to prompting or denying.** All file, network, environment, and subprocess operations require permission flags or interactive authorization.
5. **Single lockfile (`deno.lock`) at project/workspace root.** Automatically created and updated; verifies checksums for npm, JSR, and HTTPS dependencies.
6. **Web Standards are the primary runtime primitives.** `fetch`, `Request`, `Response`, `Headers`, `WebSocket`, `ReadableStream`, `crypto.subtle` are globals identical to browser standards.
7. **`deno compile` produces self-contained binaries.** Includes the V8 engine, Deno runtime, user code, and embedded assets with zero external dependencies.
8. **`node_modules` directory defaults to `auto`.** Deno 2 creates a local `node_modules` folder when npm packages require compatibility, configurable via `nodeModulesDir`.
9. **JSR packages require explicit public return types.** Packages published with `deno publish` cannot export inferred types from private or complex boundaries.
10. **`Deno.serve` provides high-performance HTTP.** Native Rust Hyper-based HTTP server with automatic HTTP/2, TLS, and WebSocket upgrades.

---

## ⚠️ Gotchas

**Permissions & Sandbox**

- ❌ `NotCapable: Requires net access to "0.0.0.0:8000", run again with --allow-net`
  - **Cause:** Starting server or making outbound HTTP calls without network permissions.
  - **Fix:** Launch with `--allow-net` or specify permissions in `deno.json` task: `"tasks": { "dev": "deno run --allow-net main.ts" }`.

- ❌ `NotCapable: Requires read access to "/path/to/file", run again with --allow-read`
  - **Cause:** Accessing filesystem files or directories without read authorization.
  - **Fix:** Pass `--allow-read` or `--allow-read=/path/to/dir` to granularly allow specific paths.

**Dependencies & Resolution**

- ❌ `error: Module not found "npm:express"`
  - **Cause:** Missing internet connection on first download, invalid package name, or typo in version specifier.
  - **Fix:** Verify package name and run `deno cache npm:express` or `deno add npm:express`.

- ❌ `error: Relative import path "utils" not prefixed with "./" or "../"`
  - **Cause:** Using bare import `import { x } from "utils"` without defining `"utils"` in `deno.json` imports.
  - **Fix:** Prefix with `./` (`import { x } from "./utils.ts"`) or add `"utils": "./utils.ts"` to `imports`.

**Node Interoperability**

- ❌ `error: Lifecycle script failed for package "npm:better-sqlite3"`
  - **Cause:** npm package requires native compilation via `node-gyp` during installation.
  - **Fix:** Run with `deno install --allow-scripts=npm:better-sqlite3` or set `"allowScripts"` in `deno.json`.

---

## 📝 Cheat sheet

```bash
# ── CLI ESSENTIALS ───────────────────────────────────────────────────
deno run -A --watch main.ts          # Run script with all permissions & hot reload
deno serve -A server.ts              # Run default export fetch handler as HTTP server
deno task <task_name>                # Execute script defined in deno.json / package.json
deno test -A --parallel --coverage   # Run tests in parallel with coverage collection
deno bench src/bench.ts              # Run performance benchmark suite
deno fmt                             # Format all TS/JS/JSON/MD files
deno lint                            # Lint codebase with recommended rules
deno check src/mod.ts                # Full TypeScript type check
deno compile -A -o dist/app main.ts  # Compile standalone executable binary
deno add jsr:@std/http npm:hono      # Add dependencies to deno.json imports
deno install --frozen                # Strict dependency installation for CI

# ── COMMON SPECIFIER PATTERNS ────────────────────────────────────────
import { assertEquals } from "jsr:@std/assert@^1.0.8" // JSR Standard Library
import express from "npm:express@^4.21.2"              // npm package
import * as fs from "node:fs/promises"                 // Node.js built-in module
import { helper } from "./utils/helper.ts"             // Local relative import

# ── MINIMAL HTTP & KV SERVER ─────────────────────────────────────────
const kv = await Deno.openKv();
Deno.serve({ port: 8000 }, async (req) => {
  const url = new URL(req.url);
  if (url.pathname === "/count") {
    await kv.atomic().sum(["hits"], 1n).commit();
    const hits = await kv.get(["hits"]);
    return Response.json({ hits: hits.value });
  }
  return new Response("Hello Deno 2!");
});
```

---

## Connections

- Uses [[ai-skills|AI Skills Index]]
- Sibling facets:
  - [[workspaces-and-package-json|Workspaces & package.json Equivalence]]
  - [[node-npm-interop|Node.js & npm Interoperability]]
  - [[cli-toolchain|CLI & Built-in Toolchain]]
  - [[permissions-security|Permissions & Security Sandbox]]
  - [[jsr-std-and-imports|JSR Registry, @std Library & Import Maps]]
  - [[runtime-apis|Runtime APIs & Web Standards]]

---

## 🔄 Provenance

- Pinned to `denoland/deno` @ `v2.2.0`. Verified 2026-08-20.
- Source of truth: Deno 2 official documentation, Deno CLI specification, and runtime engine APIs.
- To refresh: Validate against newer Deno 2 minor/patch releases and diff CLI subcommands/runtime APIs via `deno --help` and JSR `@std/*` release updates.
