# 🚀 CLI Port Specification: Nushell ➔ TypeScript (Deno + Cliffy)

> **Document Purpose**: Handover and architectural blueprint for the incoming
> session. Defines the clean separation of concerns, the generic TypeScript
> engine design in `template/src/cli`, and the elimination of intermediate
> script gates in favor of direct, transparent `deno run` Justfile recipes.

---

## 1. Executive Summary & Core Objective

We are replacing the prototype Nushell harness (`src/client/scripts/cli/`) and
the legacy Rust placeholder (`src/cli/`) with a **production-grade, reusable
TypeScript CLI engine** built with **Deno `>=1.45`** and **Cliffy `1.2.1`**
(`@cliffy/command`, `@cliffy/ansi`, `@cliffy/table`).

### The Golden Directives

1. **New Home**: `/home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/cli`
   will be wiped clean (removing old Rust artifacts: `Cargo.toml`, `src/`,
   `scripts/`) and become a standalone Deno package.
2. **Zero Nushell in the New Pipeline**: When complete, Justfile recipes in
   `src/client/` will directly invoke the Cliffy CLI via `deno run -A`:
   ```just
   types *flags:
       deno run -A ../cli/cli.ts types {{ flags }}
   ```
   No `nu` dependency, no `scripts/gates/*.nu` intermediates, and no opaque
   `--wrapped main` boilerplate.
3. **Strict Separation of Concerns**: The CLI in `src/cli` is a **100% generic
   orchestration framework** (`<TTarget, TResult, TContext>`) that knows nothing
   about Svelte or GWA. It can be published, exported, or reused across any
   software project.

---

## 2. Separation of Concerns Matrix

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       PROJECT DOMAIN LAYER (src/client)                 │
│                                                                         │
│  • Justfile (check.just, test.just, deploy.just)                        │
│      - Clean, 1-line recipes invoking `deno run -A ../cli/cli.ts`       │
│  • Domain Resolvers & Evaluators (gates & package definitions)          │
│      - Discovers `apps/*` and `sdk/*`                                   │
│      - Maps targets to `svelte-check`, `deno check`, `vitest`, `vite`   │
│      - Parses error counts from stdout/stderr                           │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Passes Typed TargetManifest & Closures
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      GENERIC CLI HARNESS (src/cli)                      │
│                                                                         │
│  • TypeScript + Deno + Cliffy 1.2.1                                     │
│  • Virtual Viewport (ANSI Framebuffer, Pin-to-Bottom, Anti-leak)       │
│  • In-Memory Process Streaming (Web Streams via Deno.Command, Zero /tmp)│
│  • Concurrency Engine (Sequential & Parallel, 60fps Live Clocks)        │
│  • Pure Generic Types: <TTarget, TResult, TContext>                     │
│  • Native Cliffy Features: --help, completions (bash/zsh/fish), prompts │
└─────────────────────────────────────────────────────────────────────────┘
```

| Responsibility                                       | Generic Engine (`src/cli/`) | Project Domain (`src/client/`) |
| :--------------------------------------------------- | :-------------------------: | :----------------------------: |
| **Virtual ANSI Framebuffer (Cursor Up, Erase Down)** |             ✅              |               ❌               |
| **60 FPS Live Clock Ticker & Spinners**              |             ✅              |               ❌               |
| **In-Memory Process Streaming (Web Streams)**        |             ✅              |               ❌               |
| **Sequential / Parallel Task Scheduler**             |             ✅              |               ❌               |
| **CLI Flag Parsing & Shell Completions**             |   ✅ (`@cliffy/command`)    |               ❌               |
| **Monorepo Topology (`apps/*`, `sdk/*`)**            |             ❌              |               ✅               |
| **Tooling Synthesizers (`svelte-check`, `vitest`)**  |             ❌              |               ✅               |
| **Diagnostic Regex Parsers (`X errors found`)**      |             ❌              |               ✅               |
| **Node Compatibility Hacks (`ensure-node-compat`)**  |             ❌              |               ✅               |

---

## 3. The New Engine Architecture (`template/src/cli/`)

### File Layout

```text
template/src/cli/
├── deno.json                # JSR imports (@cliffy/*, @std/streams), tasks, compilerOptions
├── mod.ts                   # Master library exports (types, runner, terminal, ui)
├── types.ts                 # Pure generic contracts (<TTarget, TResult, TContext>)
├── terminal.ts              # Virtual Framebuffer & ANSI Screen Manager (VirtualViewport)
├── ui.ts                    # Badges, template highlighter, duration format & Cliffy Table
├── process.ts               # Deno.Command streaming wrapper (RAM Web Streams, Zero /tmp)
├── runner.ts                # Generic suite runner (sequential & 60fps parallel scheduler)
└── cli.ts                   # Master CLI entrypoint built with @cliffy/command
```

### Key Technical Breakthroughs over Nushell

1. **In-Memory Web Streams (No Disk I/O)**:
   - _Nushell_: Wrote process output to `/tmp/gwa-stream-XXXXXX.log` and polled
     with `open`.
   - _TypeScript_: `Deno.Command` pipes directly into `ReadableStream` through
     `TextLineStream`. Output streams in RAM with zero disk writes.

2. **ANSI-Immune Table Alignment with `@cliffy/table`**:
   - _Nushell_: Fixed column widths `fill -w 14` broke with color escape codes
     or names longer than 8 chars.
   - _TypeScript_: `@cliffy/table` calculates widths by stripping ANSI escapes
     internally, ensuring mathematically perfect column borders regardless of
     package name length or styling.

3. **Strict Generic Types (Zero `any`)**:
   ```ts
   export interface BaseTarget {
     readonly name: string;
     readonly path?: string;
   }

   export interface ExecutionPlan<TTarget, TContext> {
     readonly engine: string;
     readonly cmd: readonly string[];
     readonly cwd?: string;
     readonly displayCmd?: string;
     readonly skip?: string;
     readonly badge?: string;
     readonly pre?: (target: TTarget, ctx: TContext) => Promise<void> | void;
   }

   export interface Evaluation<TResult> {
     readonly badge: string;
     readonly isErr: boolean;
     readonly errCount: number;
     readonly data: TResult;
   }

   export async function runSuite<
     TTarget extends BaseTarget,
     TResult,
     TContext,
   >(
     options: SuiteOptions<TTarget, TResult, TContext>,
   ): Promise<SuiteResult<TTarget, TResult>>;
   ```

4. **Guaranteed Terminal Cursor Safety**:
   - Installs listeners for `SIGINT`, `SIGTERM`, and `unload` to always execute
     `cursor.show` if the user interrupts execution.

5. **First-Class CLI Ergonomics (`@cliffy/command`)**:
   - Auto-generated `--help` documentation.
   - Shell completion generation
     (`gwa completions bash > /etc/bash_completion.d/gwa`).
   - Hierarchical global options (`-v, --verbose`, `-p, --parallel`,
     `-b, --bench`, `--fail-fast`, `-f, --filter`).

---

## 4. The Clean Justfile Design (Zero Magic)

No `--wrapped main`. No repetitive boilerplate. Justfiles become crystal clear:

```just
# template/src/client/scripts/check.just

CLI := "deno run -A " + source_directory() / "../../cli/cli.ts"

[doc('Audit types across workspace packages (pass -v for logs, -p for parallel)')]
[group('check')]
types *flags:
    {{ CLI }} types {{ flags }}

[doc('Lint workspace packages')]
[group('check')]
lint *flags:
    {{ CLI }} lint {{ flags }}
```

```just
# template/src/client/scripts/test.just

CLI := "deno run -A " + source_directory() / "../../cli/cli.ts"

[doc('Run tests across workspace (pass -v for logs, -p for parallel)')]
[group('test')]
test *flags:
    {{ CLI }} test {{ flags }}
```

---

## 5. Implementation Roadmap for the Next Session

When opening the new conversation, execute this sequence:

1. **Clean Slate**:
   - `rm -rf /home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/cli/*`
2. **Initialize Deno Workspace**:
   - Create `deno.json` importing `@cliffy/command@1.2.1`, `@cliffy/ansi@1.2.1`,
     `@cliffy/table@1.2.1`, `@std/streams@1.0.8`.
3. **Core Engine**:
   - Build `types.ts`, `terminal.ts`, `process.ts`, `ui.ts`, `runner.ts`,
     `mod.ts`.
4. **Domain Gates Integration**:
   - Build quality gates (`types`, `test`, `build`) in `cli.ts` (or modular
     `gates/`).
5. **Justfile Rewire**:
   - Update `check.just`, `test.just`, `deploy.just` to invoke the Cliffy CLI
     directly.
6. **Validation & Benchmark**:
   - Verify `just types -p`, `just test -p`, `just build` running seamlessly via
     Deno.
