# [[deno]] [[runtime-apis]] [[kv]] [[serve]]

> [!abstract] Purpose
> Complete technical reference for Deno 2 runtime APIs: high-performance HTTP server (Deno.serve), embedded KV database (Deno.openKv), background cron jobs (Deno.cron), subprocess execution (Deno.Command), FFI, and Web standard APIs.

## ⚡ Runtime API Patterns & Signatures

### Modern HTTP Server (`Deno.serve`)

```ts
// High-performance HTTP server with WebSockets and Graceful Shutdown
const ac = new AbortController()

const server = Deno.serve(
  {
    port: 8000,
    hostname: '0.0.0.0',
    signal: ac.signal,
    onListen({ port, hostname }) {
      console.log(`Server listening on http://${hostname}:${port}`)
    },
    onError(error) {
      console.error('Unhandled server error:', error)
      return new Response('Internal Server Error', { status: 500 })
    },
  },
  (req: Request, info: Deno.ServeHandlerInfo): Response | Promise<Response> => {
    const url = new URL(req.url)

    // WebSocket Upgrade pattern
    if (url.pathname === '/ws') {
      if (req.headers.get('upgrade') !== 'websocket') {
        return new Response('Expected WebSocket upgrade', { status: 400 })
      }
      const { socket, response } = Deno.upgradeWebSocket(req)
      socket.onopen = () => socket.send('Connected to Deno 2 WebSocket')
      socket.onmessage = (e) => socket.send(`Echo: ${e.data}`)
      return response
    }

    if (url.pathname === '/api/health') {
      return Response.json({ status: 'ok', clientIp: info.remoteAddr.hostname })
    }

    return new Response('Not Found', { status: 404 })
  },
)
```

---

### Embedded Key-Value Database (`Deno.openKv`)

```ts
// Open database instance (local SQLite backend or Deno Deploy cloud backend)
const kv = await Deno.openKv()

// 1. Basic CRUD operations
await kv.set(['users', 'u123'], { name: 'Ada Lovelace', role: 'admin' })
const entry = await kv.get<{ name: string; role: string }>(['users', 'u123'])
console.log('Value:', entry.value, 'Versionstamp:', entry.versionstamp)

// 2. ACID Atomic Transaction with optimistic locking check
const accountKey1 = ['accounts', 'acc_1']
const accountKey2 = ['accounts', 'acc_2']

const [acc1, acc2] = await kv.getMany<number[]>([accountKey1, accountKey2])
const transferAmount = 50

const commitRes = await kv.atomic()
  .check(acc1) // Fails transaction if acc1 was modified by another process
  .check(acc2)
  .set(accountKey1, (acc1.value ?? 0) - transferAmount)
  .set(accountKey2, (acc2.value ?? 0) + transferAmount)
  .sum(['stats', 'total_transfers'], 1n) // Atomic u64 counter
  .commit()

if (!commitRes.ok) {
  console.error('Transaction collision, retry required')
}

// 3. Range queries / List with prefix
const entries = kv.list({ prefix: ['users'] }, { limit: 10, reverse: false })
for await (const user of entries) {
  console.log(user.key, user.value)
}

// 4. Reactive real-time watch streams
const watcher = kv.watch([['users', 'u123']])
for await (const [userEntry] of watcher) {
  console.log('User state updated:', userEntry.value)
  break // terminate stream loop when done
}

// 5. Built-in Background Queue & Listeners
await kv.enqueue({ type: 'SEND_EMAIL', to: 'ada@example.com' }, { delay: 5000 })
kv.listenQueue(async (msg: { type: string; to: string }) => {
  console.log('Processing background job:', msg)
})
```

---

### Scheduled Cron Tasks (`Deno.cron`)

```ts
// Built-in cron scheduler (crontab syntax: minute hour day-of-month month day-of-week)
Deno.cron('Nightly Database Backup', '0 2 * * *', async () => {
  console.log('Starting scheduled nightly backup...')
  await performBackup()
  console.log('Backup completed.')
})

Deno.cron('Heartbeat Check', { minute: { every: 15 } }, async () => {
  await fetch('https://status.myorg.com/ping')
})
```

---

### Subprocess Execution (`Deno.Command`)

```ts
// Execute external processes with piped I/O
const command = new Deno.Command('git', {
  args: ['rev-parse', '--short', 'HEAD'],
  stdout: 'piped',
  stderr: 'piped',
})

const { code, stdout, stderr } = await command.output()
if (code === 0) {
  const commitHash = new TextDecoder().decode(stdout).trim()
  console.log('Current commit:', commitHash)
} else {
  const errorMsg = new TextDecoder().decode(stderr)
  console.error('Git command failed:', errorMsg)
}
```

---

### Native Foreign Function Interface (`Deno.dlopen`)

```ts
// Loading dynamic C/Rust shared libraries
const dylib = Deno.dlopen(
  Deno.build.os === 'windows' ? './math.dll' : './libmath.so',
  {
    add: { parameters: ['i32', 'i32'], result: 'i32' },
    compute_hash: { parameters: ['buffer', 'usize'], result: 'void' },
  },
)

const sum = dylib.symbols.add(15, 27)
console.log('FFI result:', sum) // 42
dylib.close()
```

---

### Filesystem & Explicit Resource Management

```ts
// Modern TypeScript 'using' keyword for auto-closing files
async function writeLog(entry: string) {
  using file = await Deno.open('./app.log', { write: true, create: true, append: true })
  await file.write(new TextEncoder().encode(entry + '\n'))
} // file.close() invoked automatically at block scope exit

// High-level text and JSON file utilities
await Deno.writeTextFile('./config.json', JSON.stringify({ port: 8080 }, null, 2))
const rawConfig = await Deno.readTextFile('./config.json')
```

---

## 📋 Rules & Invariants

1. **`Deno.serve` handler must return a `Response` or `Promise<Response>`.** Returning `undefined`, `null`, or `void` results in an uncaught `TypeError`.
2. **`Deno.openKv()` keys are arrays of primitives:** Allowed key parts are `string`, `number`, `bigint`, `boolean`, and `Uint8Array`. Objects or symbols throw `InvalidKey`.
3. **KV Atomic `check()` enforces versionstamp immutability.** If the target key's versionstamp changed between `get` and `commit`, the transaction aborts with `{ ok: false }`.
4. **Subprocess `Deno.Command` requires `--allow-run=<executable>`.** Running without matching permission throws `NotCapable`.
5. **WebSocket upgrades require returning the `response` object:** In `Deno.upgradeWebSocket(req)`, you must return the generated `response` from your handler.
6. **KV maximum size limits:** Key tuple max size is 2,048 bytes; value max size is 65,536 bytes (64 KB).

---

## ⚠️ Gotchas & Fixes

**HTTP & WebSockets**

- ❌ `TypeError: Deno.serve handler must return a Response or Promise<Response>`
  - **Cause:** Request handler branch completed without a `return new Response(...)`.
  - **Fix:** Ensure all execution paths return a valid `Response` or `Response.json()`.

- ❌ `InvalidHandshake: Request is not a valid WebSocket upgrade request`
  - **Cause:** Calling `Deno.upgradeWebSocket(req)` when `req.headers.get("upgrade")` is not `"websocket"`.
  - **Fix:** Guard with `if (req.headers.get("upgrade") !== "websocket") return new Response("Expected WS", { status: 400 });`.

**Deno KV & Transactions**

- ❌ `InvalidKey: Key path component cannot be undefined, symbol, or object`
  - **Cause:** Passing an object or undefined variable in a key array, e.g. `['users', user.id]` where `user.id === undefined`.
  - **Fix:** Validate that all key components are defined strings/numbers before invoking KV methods.

- ❌ `Error: Deno KV transaction failed ({ ok: false })`
  - **Cause:** Concurrent writer modified one of the checked keys before `commit()` was processed.
  - **Fix:** Wrap transaction logic in a retry loop using `@std/async/retry` or a `while (!res.ok)` loop.
