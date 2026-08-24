# [[deno]] [[cli]] [[toolchain]]

> [!abstract] Purpose
> Complete technical reference for the unified Deno 2 CLI: execution, task runner, test suite, benchmark harness, linter, formatter, type checker, standalone compiler, and package publisher.

## ⚡ CLI Subcommands & Flags Matrix

### Unified CLI Command Reference

| Subcommand | Syntax Example | Primary Options / Flags | Description |
| :--- | :--- | :--- | :--- |
| `run` | `deno run -A --watch main.ts` | `--watch`, `--reload`, `--check`, `--inspect` | Executes TS/JS script or remote URL with sandboxed permissions |
| `serve` | `deno serve -A --port=8000 server.ts` | `--port`, `--host`, `--cert`, `--key`, `--watch` | Runs an HTTP server exporting a default fetch handler |
| `task` | `deno task dev` | `--cwd <dir>`, `--recursive`, `-w` | Runs named task script defined in `deno.json` or `package.json` |
| `test` | `deno test -A --parallel --coverage` | `--filter <str>`, `--parallel`, `--coverage`, `--doc` | Runs built-in test runner across `*_test.ts` / `*.test.ts` files |
| `bench` | `deno bench -A src/bench.ts` | `--filter <str>`, `--json` | Runs microbenchmarks defined with `Deno.bench()` |
| `fmt` | `deno fmt --check src/` | `--check`, `--watch`, `--ignore` | Zero-config code formatter (JS, TS, JSX, JSON, MD, HTML, CSS) |
| `lint` | `deno lint --rules-tags=recommended` | `--rules-include`, `--rules-exclude`, `--json` | Built-in fast linter checking code quality and best practices |
| `check` | `deno check src/mod.ts` | `--all`, `--workspace` | Full TypeScript type check without emitting output files |
| `compile` | `deno compile -A --output app main.ts` | `--target <triple>`, `--include <dir>`, `--icon` | Bundles script and runtime into a single standalone binary |
| `add` | `deno add jsr:@std/http npm:hono` | `--dev`, `-D` | Adds dependencies to `deno.json` imports or `package.json` |
| `install` | `deno install --entrypoint main.ts` | `--global`, `-g`, `--allow-*`, `-n <name>` | Installs dependencies into local cache or installs executable CLI globally |
| `publish` | `deno publish --dry-run` | `--dry-run`, `--allow-slow-types`, `--token` | Publishes package to JSR package registry |
| `coverage` | `deno coverage cov_profile/ --lcov` | `--lcov`, `--html`, `--exclude` | Formats and outputs test coverage profiles |
| `info` | `deno info main.ts` | `--json`, `--location` | Inspects local/remote module dependency graph and cached locations |
| `clean` | `deno clean` | *(None)* | Cleans Deno build caches and temporary artifacts |

---

### Standalone Binary Compilation (`deno compile`)

```bash
# Basic standalone executable
deno compile --allow-net --allow-read --output myapp src/main.ts

# Embed static assets, icons, and worker scripts
deno compile --allow-net --include public/ --include templates/ --output webserver server.ts

# Cross-compilation matrix targets
deno compile --target x86_64-unknown-linux-gnu   --output dist/app-linux-x64   main.ts
deno compile --target aarch64-unknown-linux-gnu --output dist/app-linux-arm64 main.ts
deno compile --target x86_64-apple-darwin       --output dist/app-mac-x64     main.ts
deno compile --target aarch64-apple-darwin     --output dist/app-mac-arm64   main.ts
deno compile --target x86_64-pc-windows-msvc    --output dist/app-win-x64.exe main.ts
```

---

### Test Runner & Assertions (`Deno.test`)

```ts
import { assertEquals, assertRejects, assertThrows } from 'jsr:@std/assert@^1.0.8'

Deno.test('basic math suite', () => {
  assertEquals(2 + 2, 4)
})

Deno.test('nested test steps', async (t) => {
  const db = { connected: true }

  await t.step('step 1: verify db state', () => {
    assertEquals(db.connected, true)
  })

  await t.step('step 2: verify error thrown', () => {
    assertThrows(() => {
      throw new Error('boom')
    }, Error, 'boom')
  })
})

Deno.test({
  name: 'permission-gated network test',
  permissions: { net: ['api.github.com'] },
  sanitizeOps: true,
  sanitizeResources: true,
  fn: async () => {
    const res = await fetch('https://api.github.com/zen')
    assertEquals(res.status, 200)
    await res.text()
  },
})
```

---

### Benchmark Suite (`Deno.bench`)

```ts
import { bench } from 'jsr:@std/testing/bench'

Deno.bench('Array.push (baseline)', { baseline: true }, () => {
  const arr = []
  for (let i = 0; i < 1000; i++) arr.push(i)
})

Deno.bench('Uint32Array allocation', () => {
  const arr = new Uint32Array(1000)
  for (let i = 0; i < 1000; i++) arr[i] = i
})
```

---

### Toolchain Configuration in `deno.json`

```jsonc
{
  "lint": {
    "include": ["src/"],
    "exclude": ["src/generated/"],
    "rules": {
      "tags": ["recommended"],
      "include": ["explicit-module-boundary-types", "no-console"],
      "exclude": ["no-explicit-any"]
    }
  },
  "fmt": {
    "useTabs": false,
    "lineWidth": 100,
    "indentWidth": 2,
    "singleQuote": true,
    "proseWrap": "always",
    "include": ["src/", "tests/"]
  },
  "test": {
    "include": ["tests/", "src/**/*_test.ts"],
    "exclude": ["tests/fixtures/"]
  },
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "strict": true,
    "noImplicitAny": true
  }
}
```

---

## 📋 Rules & Invariants

1. **`deno run` performs fast-strip type checking by default.** Type errors do not block execution unless `--check` flag is explicitly passed or `deno check` is executed.
2. **Resource & Async Op Sanitizers are active in tests.** Tests fail if they leak open file descriptors, active sockets, or unawaited async timers (`sanitizeOps: true`, `sanitizeResources: true`).
3. **Lockfile validation in CI:** Use `deno install --frozen` or pass `--frozen` to prevent silent lockfile modification in CI environments.
4. **Embedded assets in `deno compile` require runtime fetch or FS reading.** Files included via `--include <dir>` are accessible via standard `Deno.readTextFile()` using relative paths from the executable root or via `import.meta.resolve()`.
5. **Auto-reload with `--watch` responds to dependency graph.** Deno inspects imported modules and reloads only when affected files in the graph change.

---

## ⚠️ Gotchas & Fixes

**Testing & Ops Sanitization**

- ❌ `error: Test failed: 1 async op was started in this test, but never completed before the test finished: op_sleep`
  - **Cause:** `setTimeout` or unresolved async Promise remained active when the test function exited.
  - **Fix:** Clear timer (`clearTimeout(id)`), `await` all promises, or set `sanitizeOps: false` on the test config.

- ❌ `error: Test failed: 1 resource was leaked in this test: "FsFile" (rid 4)`
  - **Cause:** File opened via `Deno.open()` was not closed before test completion.
  - **Fix:** Use `using file = await Deno.open(...)` (Explicit Resource Management) or call `file.close()` in a `finally` block.

**Compilation & Types**

- ❌ `error: deno compile failed: dynamic import could not be statically analyzed`
  - **Cause:** Using `await import(variablePath)` with non-string literals without embedding the asset directory.
  - **Fix:** Pass `--include <dir>` to `deno compile` to bundle all possible dynamic runtime modules into the binary.

- ❌ `error: Lockfile verification failed for "deno.lock"`
  - **Cause:** Running in `--frozen` mode when a dependency version or checksum in the remote registry changed.
  - **Fix:** Run `deno install` without `--frozen` to update `deno.lock`, verify the diff, and commit the updated lockfile.
