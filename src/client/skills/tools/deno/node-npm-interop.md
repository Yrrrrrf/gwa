# [[deno]] [[node]] [[npm]]

> [!abstract] Purpose
> Complete technical reference for Node.js compatibility, npm package specifiers, node_modules directory resolution strategies, CommonJS/ESM interop, and native C/C++ addons in Deno 2.

## ⚡ Node & npm Integration Patterns

### npm Specifier Patterns

```ts
// 1. Direct npm package import with version pin
import express from 'npm:express@^4.21.2'

// 2. Subpath imports from npm packages
import { format } from 'npm:date-fns@^4.1.0/format'

// 3. Types from npm (@types/* auto-discovered or explicitly imported)
import type { Request, Response } from 'npm:@types/express@^4.17.21'

// 4. Node.js built-in module imports (preferred node: prefix)
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { Buffer } from 'node:buffer'
import { createServer } from 'node:http'
import EventEmitter from 'node:events'
```

---

### `node_modules` Resolution Strategies

| Flag / Setting | `deno.json` Equivalent | Behavior | Best Use Case |
| :--- | :--- | :--- | :--- |
| `--node-modules-dir=auto` *(Default in Deno 2)* | `"nodeModulesDir": "auto"` | Creates local `node_modules` folder on demand when running or installing npm packages | IDE autocompletion, tools expecting local `node_modules` |
| `--node-modules-dir=manual` | `"nodeModulesDir": "manual"` | Only populates `node_modules` on explicit `deno install`; does not modify during `deno run` | CI pipelines, strict build reproducibility |
| `--node-modules-dir=none` | `"nodeModulesDir": "none"` | Uses global central cache exclusively; no local `node_modules` created | Serverless / container deployments, disk-space minimization |

---

### CommonJS & ESM Interoperability

```ts
// ESM importing CommonJS (Default export contains CJS module.exports)
import cjsModule from 'npm:cjs-package@1.0.0'
console.log(cjsModule.someFunction())

// Accessing named exports synthesized by Deno static analyzer
import { namedFn } from 'npm:cjs-package@1.0.0'

// Dynamic require() using createRequire
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const legacyData = require('./legacy.json')
const legacyPkg = require('some-cjs-package')
```

---

### Node.js Globals & Environment Parity

| Node.js Global / API | Deno 2 Parity | Required Permission Flag | Notes |
| :--- | :--- | :--- | :--- |
| `process.env` | Supported | `--allow-env` | Reflects system environment variables |
| `process.argv` | Supported | *(None)* | Equivalent to `['deno', 'script.ts', ...args]` |
| `process.cwd()` | Supported | `--allow-read` | Returns current working directory |
| `Buffer` | Supported | *(None)* | Available globally and from `node:buffer` |
| `__dirname` / `__filename` | Supported in CJS / `.cjs` | *(None)* | In ESM, use `import.meta.dirname` / `import.meta.filename` |
| `setImmediate` / `clearImmediate` | Supported | *(None)* | Node timer compatibility |
| `global` | Supported | *(None)* | Alias for `globalThis` |
| `process.exit(code)` | Supported | *(None)* | Immediate process termination |

---

### Native Addons & Lifecycle Scripts (`node-gyp` / N-API)

```bash
# Allow lifecycle scripts for specific npm packages with native binaries
deno run --allow-scripts=npm:esbuild,npm:sharp,npm:sqlite3 -A server.ts

# Allow lifecycle scripts for all packages in project
deno install --allow-scripts
```

```jsonc
// deno.json
{
  "nodeModulesDir": "auto",
  "allowScripts": [
    "npm:esbuild@0.24.2",
    "npm:sharp@0.33.5"
  ]
}
```

---

## 📋 Rules & Invariants

1. **`node:` prefix is recommended, bare Node built-ins supported for compatibility.** `import fs from "node:fs"` is preferred; `import fs from "fs"` resolves automatically if Node compatibility mode is engaged.
2. **`npm:` packages run inside the Deno security sandbox.** An npm package making network calls still requires `--allow-net`, file access requires `--allow-read`/`--allow-write`.
3. **Lifecycle scripts (`postinstall`) are blocked by default.** Deno does not execute npm pre/postinstall hooks unless explicitly listed in `allowScripts` in `deno.json` or `--allow-scripts` CLI flag.
4. **`import.meta.dirname` and `import.meta.filename` are native.** Available out of the box in ESM without requiring `fileURLToPath(import.meta.url)`.
5. **CJS / ESM boundary resolution:** When importing CommonJS packages with dynamic export mutation, destructuring named exports may fail at parse time. Use default import `import pkg from "npm:pkg"` and access properties on `pkg`.
6. **Dual package hazard prevention:** Deno resolves a single instance of packages specified across `npm:` and `jsr:` where possible.

---

## ⚠️ Gotchas & Fixes

**Permissions & Sandbox**

- ❌ `NotCapable: Requires net access to "registry.npmjs.org", run again with --allow-net`
  - **Cause:** npm package attempting network I/O without granted permissions.
  - **Fix:** Pass `--allow-net` or `--allow-net=registry.npmjs.org` to `deno run` or specify permissions in `deno.json` task.

- ❌ `error: Lifecycle script not permitted for package "npm:esbuild@0.24.0"`
  - **Cause:** Package requires compiling native bindings via postinstall, but script execution was not granted.
  - **Fix:** Add `"allowScripts": ["npm:esbuild"]` to `deno.json` or pass `--allow-scripts=npm:esbuild`.

**CommonJS Interop**

- ❌ `TypeError: (0 , _cjsPkg.default) is not a function`
  - **Cause:** Importing a CommonJS module using `import pkg from 'npm:pkg'` where the module assigned directly to `module.exports = function() {}`.
  - **Fix:** Use namespace import or check default wrapper: `import * as pkg from 'npm:pkg'` or `import pkg from 'npm:pkg'; const fn = pkg.default || pkg;`.

- ❌ `ReferenceError: require is not defined in ES module scope`
  - **Cause:** Using `require()` inside an `.js` or `.ts` file without creating a require context.
  - **Fix:** Rename file to `.cjs` or use `import { createRequire } from "node:module"; const require = createRequire(import.meta.url);`.
