# [[deno]] [[permissions]] [[security]]

> [!abstract] Purpose
> Complete technical reference for the Deno 2 security sandbox, granular CLI permission flags, allow/deny constraints, dynamic runtime permission queries, and worker security isolation.

## ⚡ Permissions Flags & Descriptors Reference

### Granular CLI Permission Matrix

| Capability | Allow Flag & Granular Syntax | Deny Flag Syntax | Runtime Capability Controlled |
| :--- | :--- | :--- | :--- |
| **All** | `-A`, `--allow-all` | `--deny-all` | Bypasses all security sandbox constraints |
| **Network** | `--allow-net=api.github.com:443,127.0.0.1:8000` | `--deny-net=evil.com` | Outbound/inbound TCP, UDP, TLS, HTTP, WebSocket |
| **Read FS** | `--allow-read=/tmp,./data` | `--deny-read=/etc/shadow` | Reading files, directory traversal, stat inspection |
| **Write FS** | `--allow-write=/tmp,./output` | `--deny-write=/etc` | Creating, modifying, deleting files & directories |
| **Env Vars** | `--allow-env=PORT,DATABASE_URL,NODE_ENV` | `--deny-env=AWS_SECRET_KEY` | Accessing system environment variables |
| **Subprocesses** | `--allow-run=git,deno,ffmpeg` | `--deny-run=rm,sudo` | Spawning OS child processes via `Deno.Command` |
| **System Info** | `--allow-sys=hostname,uid,systemMemoryInfo` | `--deny-sys=osRelease` | Querying OS metrics, CPU info, user IDs, network interfaces |
| **FFI (Native)** | `--allow-ffi=./libfoo.so,./libbar.dylib` | `--deny-ffi` | Loading dynamic shared C/C++ libraries via `Deno.dlopen` |
| **Prompts** | `--no-prompt` | *(Default in CI)* | Aborts immediately on missing permission without interactive prompt |

---

### Programmatic Runtime Permissions (`Deno.permissions`)

```ts
// 1. Querying current permission state ('granted' | 'denied' | 'prompt')
const readStatus = await Deno.permissions.query({
  name: 'read',
  path: './data.json',
})
console.log('Read permission:', readStatus.state)

// 2. Requesting permission dynamically at runtime
if (readStatus.state === 'prompt') {
  const requested = await Deno.permissions.request({
    name: 'read',
    path: './data.json',
  })
  if (requested.state !== 'granted') {
    throw new Error('User declined filesystem read access')
  }
}

// 3. Revoking previously granted permission (Principle of Least Privilege)
const revoked = await Deno.permissions.revoke({
  name: 'read',
  path: './data.json',
})
console.log('Revoked state:', revoked.state) // 'prompt'

// 4. Subscribing to permission state change events
readStatus.onchange = () => {
  console.log('Permission changed to:', readStatus.state)
}
```

---

### Web Worker Sandbox Isolation

Workers inherit parent permissions by default or can be restricted to a narrower subset:

```ts
// Parent process spawned with -A
const worker = new Worker(new URL('./worker.ts', import.meta.url).href, {
  type: 'module',
  deno: {
    permissions: {
      net: ['api.internal.com'],
      read: ['./data'],
      write: false,
      env: false,
      run: false,
    },
  },
})

worker.postMessage({ task: 'process' })
```

---

## 📋 Rules & Invariants

1. **`--deny-*` always overrides `--allow-*`.** If `--allow-read=/data` and `--deny-read=/data/secret` are both set, reading `/data/secret/file.txt` throws `NotCapable`.
2. **Interactive prompt fails in non-TTY / CI environments.** Without an active TTY, Deno defaults to `--no-prompt` behavior and throws `NotCapable` immediately.
3. **Subprocess execution requires executable name constraint:** `--allow-run=git` permits executing `/usr/bin/git`, but forbids executing `/usr/bin/git-secret` or `sh -c git`.
4. **Symlink traversal requires read permission on both source and target:** Reading a symlink pointing outside the allowed path boundaries is blocked.
5. **Worker permissions cannot exceed parent permissions:** Attempting to assign `net: true` to a Worker when the parent process was launched without `--allow-net` throws a `TypeError`.
6. **Dynamic request (`request()`) only prompts if current state is `'prompt'`.** If previously denied via `--deny-*`, `request()` returns `{ state: 'denied' }` without opening a prompt.

---

## ⚠️ Gotchas & Fixes

**Runtime NotCapable Errors**

- ❌ `NotCapable: Requires net access to "0.0.0.0:8000", run again with --allow-net`
  - **Cause:** Running an HTTP server or client network call without granting net permission.
  - **Fix:** Launch with `deno run --allow-net=0.0.0.0:8000 main.ts` or add permission flags to task in `deno.json`.

- ❌ `NotCapable: Requires read access to "/home/user/.env", denied by --deny-read`
  - **Cause:** `--deny-read` constraint directly matched requested file path.
  - **Fix:** Remove conflicting deny pattern or adjust target directory paths.

- ❌ `PermissionPromptError: Permission prompt is not supported in non-interactive environment`
  - **Cause:** Automated CI script or daemon thread hit a missing permission and attempted to trigger an interactive prompt.
  - **Fix:** Supply all required `--allow-*` flags explicitly in CI task commands.

**Worker Constraints**

- ❌ `TypeError: Worker permission cannot exceed parent process permissions`
  - **Cause:** Granting permissions to a child Web Worker that the parent process does not hold.
  - **Fix:** Add necessary `--allow-*` flag to parent execution before spawning worker with granular permissions.
