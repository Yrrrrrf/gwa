# [[deno]] [[jsr]] [[std]] [[imports]]

> [!abstract] Purpose
> Complete technical reference for the JSR package registry, Deno Standard Library (@std/*) modules, import map configuration, scopes, URL dependency caching, and JSR publishing rules.

## ⚡ JSR & @std Module Catalog

### Deno Standard Library (`@std/*`) Primary Packages

| Package | Primary Specifier | Key APIs & Exports | Core Purpose |
| :--- | :--- | :--- | :--- |
| `@std/assert` | `jsr:@std/assert@^1.0` | `assertEquals`, `assertNotEquals`, `assertThrows`, `assertRejects`, `assertExists` | Strict assertions for testing |
| `@std/http` | `jsr:@std/http@^1.0` | `serveDir`, `serveFile`, `STATUS_CODE`, `STATUS_TEXT`, `cookie` | Static file serving & HTTP helpers |
| `@std/fs` | `jsr:@std/fs@^1.0` | `exists`, `ensureDir`, `copy`, `move`, `walk`, `expandGlob` | High-level filesystem utilities |
| `@std/path` | `jsr:@std/path@^1.0` | `join`, `resolve`, `basename`, `dirname`, `extname`, `relative`, `globToRegExp` | Path manipulation & normalization |
| `@std/async` | `jsr:@std/async@^1.0` | `delay`, `debounce`, `throttle`, `retry`, `deadline`, `abortable` | Async flow control primitives |
| `@std/dotenv` | `jsr:@std/dotenv@^1.0` | `load`, `loadSync`, `stringify` | `.env` file parsing and loading |
| `@std/crypto` | `jsr:@std/crypto@^1.0` | `crypto`, `digest`, `toHashString` | Cryptographic hashing extensions |
| `@std/cli` | `jsr:@std/cli@^1.0` | `parseArgs`, `promptSecret`, `spinner` | CLI argument parsing and terminal UI |
| `@std/collections` | `jsr:@std/collections@^1.0` | `groupBy`, `chunk`, `distinct`, `mapKeys`, `sortBy`, `zip` | Array and object utility functions |
| `@std/streams` | `jsr:@std/streams@^1.0` | `toBlob`, `toText`, `toArrayBuffer`, `mergeReadableStreams` | Web Streams manipulation helpers |
| `@std/jsonc` | `jsr:@std/jsonc@^1.0` | `parse`, `stringify` | JSON with Comments parser |
| `@std/yaml` | `jsr:@std/yaml@^1.0` | `parse`, `stringify` | YAML schema parser and serializer |
| `@std/toml` | `jsr:@std/toml@^1.0` | `parse`, `stringify` | TOML document parser and serializer |
| `@std/uuid` | `jsr:@std/uuid@^1.0` | `v1`, `v4`, `v5`, `validate` | UUID generation and validation |
| `@std/ulid` | `jsr:@std/ulid@^1.0` | `ulid`, `monotonicUlid`, `decodeTime` | Lexicographically sortable unique IDs |
| `@std/log` | `jsr:@std/log@^1.0` | `getLogger`, `setup`, `ConsoleHandler`, `FileHandler` | Structured logging framework |

---

### Import Maps & Scopes in `deno.json`

```jsonc
{
  "imports": {
    "@std/assert": "jsr:@std/assert@^1.0.8",
    "@std/fs": "jsr:@std/fs@^1.0.6",
    "@std/path": "jsr:@std/path@^1.0.8",
    "hono": "npm:hono@^4.6.14",
    "chalk": "npm:chalk@^5.4.1",
    "@utils/": "./src/utils/"
  },
  "scopes": {
    "./src/legacy/": {
      "lodash": "npm:lodash-es@^4.17.21"
    }
  }
}
```

```ts
// Consuming mapped imports in TypeScript
import { assertEquals } from '@std/assert'
import { join } from '@std/path'
import { exists } from '@std/fs'
import { Hono } from 'hono'
import { helper } from '@utils/helper.ts'
```

---

### JSR Publishing & Slow Types Rules

```jsonc
// deno.json for JSR publication
{
  "name": "@my-scope/my-lib",
  "version": "1.0.0",
  "exports": {
    ".": "./src/mod.ts",
    "./submodule": "./src/sub.ts"
  },
  "publish": {
    "include": ["src/", "README.md", "LICENSE"],
    "exclude": ["src/**/*_test.ts"]
  }
}
```

```ts
// src/mod.ts — JSR Compliant (Explicit types on public API)
export interface User {
  id: string
  name: string
}

// ✅ Explicit return type and param types required by JSR fast type analyzer
export function createUser(name: string): User {
  return { id: crypto.randomUUID(), name }
}

// ❌ Avoid missing return types or inferring from unexported private classes
// export function badFunction(name: string) { return new PrivateClass(name); }
```

```bash
# Verify slow types and dry-run publish
deno publish --dry-run
```

---

## 📋 Rules & Invariants

1. **Explicit export types required for JSR publishing.** Functions and constants exported from public entry points cannot infer complex types across unexported boundaries.
2. **JSR packages are distributed as pure TypeScript / ESM.** JSR transpiles TypeScript on demand to `.d.ts` and `.js` for npm/Node.js consumers.
3. **Import map paths must use relative prefixes.** Local directory mappings in `"imports"` must begin with `./` or `../` (e.g. `"@app/": "./src/"`).
4. **HTTPS URL imports are immutable and integrity-checked.** Once downloaded, remote URL modules are cached in `$DENO_DIR` and pinned by checksum in `deno.lock`.
5. **Scopes allow isolated dependency overriding:** Specifiers declared under `"scopes": { "./subpath/": { ... } }` take precedence only for files located within that subpath.

---

## ⚠️ Gotchas & Fixes

**JSR Publication Errors**

- ❌ `error[slow-types]: Missing explicit return type on exported function 'calculate'`
  - **Cause:** JSR fast documentation and type generation requires explicit return type annotations on all exported declarations.
  - **Fix:** Add return type: `export function calculate(x: number): number { ... }`.

- ❌ `error[no-slow-types]: Exported symbol references private or unexported type`
  - **Cause:** Public function returns an interface not included in `exports` or marked `export`.
  - **Fix:** Export the return type interface or inline the shape definition.

**Import Map Resolution**

- ❌ `error: Relative import path "utils/helper.ts" not prefixed with "./" or "../"`
  - **Cause:** Importing a relative file without `./` prefix in an environment without a matching import map key.
  - **Fix:** Change import to `./utils/helper.ts` or configure `"@utils/": "./utils/"` in `deno.json`.

- ❌ `error: Integrity check failed for remote URL import`
  - **Cause:** Upstream remote URL script was modified, causing its sha256 checksum to diverge from `deno.lock`.
  - **Fix:** Run `deno install --reload` to fetch the updated file and update `deno.lock`, or verify remote integrity.
