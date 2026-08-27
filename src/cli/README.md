# 🚀 @gwa/cli-engine (v0.0.1)

A production-grade, 100% domain-agnostic terminal orchestration engine and
Virtual Viewport for Deno & TypeScript, built with **Deno `>=2.0`** and **Cliffy
`1.2.1`**.

---

## 🌟 Key Features

- 🧠 **Pure Generics (`<TTarget, TResult, TContext>`)**: Completely decoupled
  from any specific workspace layout, tooling, or frameworks.
- ⚡ **In-Memory Web Streams**: Piped process execution via `Deno.Command` and
  `TextLineStream` in RAM. Zero disk writes, zero `/tmp` files, and pipe
  deadlock prevention.
- ⏱️ **60 FPS Live Clock Ticker**: Real-time elapsed duration and animated
  spinners across all concurrent rows in parallel execution mode (`-p`).
- 🖥️ **ANSI Virtual Viewport**: Pinned-bottom status table, automatic line
  clamping to prevent terminal line-wrapping glitches, and viewport overflow
  protection.
- 🛡️ **Guaranteed Cursor Safety**: Signal traps on `SIGINT`, `SIGTERM`, and
  `unload` guarantee the terminal cursor is restored on abort.
- 🤖 **Headless CI Support**: Automatically detects non-TTY or `CI=true`
  environments and switches to append-only sequential log streaming without ANSI
  escape codes.
- 📊 **Cliffy Table Alignment**: Mathematical column borders calculated by
  stripping ANSI escape sequences internally.

---

## 📦 Installation & Usage

```ts
import { runSuite } from "@gwa/cli-engine";
import type { BaseTarget, TargetCategory } from "@gwa/cli-engine";

interface MyTarget extends BaseTarget {
  path: string;
}

const categories: TargetCategory<MyTarget>[] = [
  {
    name: "PACKAGES",
    targets: [{ name: "core", path: "packages/core" }],
  },
];

const result = await runSuite({
  title: "TYPECHECK",
  categories,
  isParallel: true,
  resolver: (target) => ({
    engine: "deno",
    cmd: ["deno", "check", `${target.path}/mod.ts`],
    displayCmd: `deno check ${target.path}/mod.ts`,
  }),
  evaluator: (res) => ({
    badge: res.exitCode === 0 ? "(0 errors)" : "(errors)",
    isErr: res.exitCode !== 0,
    errCount: res.exitCode === 0 ? 0 : 1,
  }),
  successMsg: "✓ All packages passed",
  failMsg: (errs) => `✗ ${errs} packages failed`,
});
```

---

## 🧪 Testing

```bash
deno test -A
```
