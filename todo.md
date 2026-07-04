# GWA · Just Harness Restructure — Execution Plan

> Spec-driven, zero-code implementation plan. A model or engineer executes this
> top-to-bottom without asking questions. Every instruction carries its reason.
> Verified against `just 1.55.1` behavior (module-recipe dependencies, module
> settings isolation, module-local imports) before writing.

---

## 0. Executive Summary

The template's build harness is restructured into the house five-verb pattern
(`fmt`/`lint`/`types` → `check`; `test`; `ci = check + test`; `dev`; `deploy`),
replicated as **four identical `scripts/` trees** — root, `src/client`,
`src/server`, `src/cli` — each containing the _same-named_ layer files with
recipe bodies _specific to that part_ of the project. Root and server stop
shelling out with `just -f path/x.just verb` and instead compose through
**module-recipe dependencies** (`fmt: client::fmt server::fmt cli::fmt`), which
are statically checked, deduplicated, and run in each module's own directory.
The recipe shell becomes **nushell everywhere** (`set shell := ["nu", "-c"]`,
declared per module because modules do not inherit settings). Auxiliary shell
scripts (`entrypoint.sh`, `init-db.sh`, `grpcurl.sh`) are ported to `.nu`.
Naming drift is resolved to the `gwa-` prefix. This is the right long-term bet
because the harness _is_ the template's public API: a consumer learns the verbs
once and they mean the same thing at every level, forever; only the tool inside
a recipe changes per language.

---

## 1. Context, Decision Record, Assumptions

### 1.1 Context

- **Existing monorepo template** ("GWA — General Web App"), destination-agnostic
  SPA (Tauri later), consumed by forking.
- Stack: Deno + Svelte 5 client · Rust engine + Go rpc + SurrealDB server · Nix
  dev shells · `just` runner · podman containers.
- Current harness state: root `scripts/{ci,deploy,dev}.just` (incomplete layer
  set, bash shell), monolithic `client.just` / `server.just`, single-file leaf
  justfiles (`db`/`engine`/`rpc`/`tests`), empty `src/cli`, fan-out via
  recursive `just -f` calls, verbs named `typecheck`/`quality`.
- **Scale target:** one maintainer today; N forks over years. Optimization
  target is _consumer legibility_, not build speed.

### 1.2 Decision record (locked in the alignment loop — do not re-litigate)

| #   | Decision                                                | Chosen                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Which directories get a `scripts/` tree                 | Root, `src/client`, `src/server`, `src/cli` — each with the same six files (`_shared`, `dev`, `check`, `test`, `ci`, `deploy` `.just`), bodies adapted per part. Leaves (`db`, `engine`, `rpc`, `tests`) stay single-file modules.                  |
| D2  | Fan-out mechanism                                       | Module-recipe dependencies (`fmt: client::fmt …`), never recursive `just -f` in bodies.                                                                                                                                                             |
| D3  | Verb names                                              | Canonical house verbs: `fmt`/`lint`/`types`, umbrella `check`, `test`, `ci = check + test`. `typecheck` and `quality` are retired everywhere.                                                                                                       |
| D4  | Shell                                                   | `set shell := ["nu", "-c"]` in **every** justfile entry (root, four trees, four leaves). Bashism recipe bodies rewritten as nu, each with a doc comment stating what it must do.                                                                    |
| D5  | Broken recipes (client `deploy`, `pwa-check`)           | Honest stubs: the verb stays, the body raises a structured error stating exactly what's missing; a doc comment states the intent. Deploy layer semantics: **deploy = podman/shipping; dev = local loop.**                                           |
| D6  | Stale root `docker-compose.yml` + missing `traefik.yml` | Deferred. Not touched; a reminder is recorded in `docs/todo.md`.                                                                                                                                                                                    |
| D7  | Client tooling                                          | Deno for everything (`deno fmt`, `deno lint`, `deno run -A npm:…`, `deno test -A`). All `bun`/`bunx` invocations removed from recipes; `bun` removed from the client dev shell.                                                                     |
| D8  | Client `check`                                          | Composes `fmt lint types` like every other level; `types` stops swallowing errors (no `-` sigils) — a gate that cannot fail is not a gate.                                                                                                          |
| D9  | Auxiliary scripts                                       | `entrypoint.sh`, `init-db.sh`, `grpcurl.sh` → `.nu` ports. The db container image gains a `nu` binary to run them.                                                                                                                                  |
| D10 | Naming                                                  | `argus-rpc` → `gwa-rpc` (Go module + imports + `buf.gen.yaml` + regen). `client.just` header "Xibalbá" → "GWA · Client". App-copy `XIBALBA` strings inside Svelte components are **out of scope** (already scheduled by `docs/todo.md` "Semana 8"). |
| D11 | Toolchain                                               | `nushell` added to `src/server/pkgs.nix` `base` group and to the client flake. No install/bootstrap recipe added (explicitly deferred).                                                                                                             |
| D12 | Docs                                                    | README and `docs/todo.md` command references fixed to the new invocation grammar. No new docs written.                                                                                                                                              |

### 1.3 Assumptions (flagged; execute as stated unless one proves false)

- **[ASSUMPTION]** `src/server/tests/tests.just` is rewritten from scratch — its
  source was unreadable in the provided export. Its contract is reconstructed
  from how `server.just` used it (fmt/lint/typecheck fan-in target + `vite-plus`
  runner) and from `src/server/tests/` contents.
- **[ASSUMPTION]** `src/server/rpc/tests/bin/mint-token` (a Go helper invoked by
  `grpcurl.sh`) exists locally but was absent from the export (likely
  untracked). The `.nu` port preserves the call verbatim and fails loudly if
  it's missing. Do not implement mint-token.
- **[ASSUMPTION]** The nushell container image
  `ghcr.io/nushell/nushell:<version>-bookworm` provides a glibc `nu` binary
  copyable into `debian:bookworm-slim` (mirroring the existing
  `COPY --from=surrealdb/surrealdb:v3` pattern). The implementer verifies the
  in-image binary path once before wiring it. **[REVISIT]** if unavailable: use
  a builder stage that fetches the official musl release binary instead.
- **[ASSUMPTION]** `just` ≥ 1.42 available everywhere (nixpkgs-unstable ships
  current). Module-recipe dependencies, module-local imports, and
  `[working-directory]` were all empirically verified on 1.55.1.
- **[ASSUMPTION]** `deno test -A` with zero matching test files exits 0 (client
  has no test files yet; the verb must exist and pass vacuously).
- **[ASSUMPTION]** Only one client app exists (`apps/vision`); parameter
  defaults may name it literally (see §4.3 — backtick defaults break under the
  nu shell).

### 1.4 Out of scope (do not touch)

Root `docker-compose.yml` and the `traefik.yml` it mounts (D6) · all application
source (Svelte, Rust, Go, SurrealQL) except the Go-import rename sweep (D10) ·
install/bootstrap recipes (D11) · GitHub Actions workflows (none exist;
deferred) · `watch`/`clean`/`audit` verbs (nothing to wire them to; inventing
them violates simplicity-first) · verify-only `ci` mode (`fmt --check`) —
deferred until a CI workflow exists · `db/docker-compose.yml` · `.env.example` ·
hurl test suite · the `[fallow]` item in `src/client/todo.md` (unknown tool; not
part of the confirmed decisions).

---

## 2. Architecture Overview

### 2.1 Topology — one grammar, four levels

The harness is a tree of **just modules** (namespaced, isolated) whose _entry
files_ are thin: they declare settings, mount child modules, and import their
local `scripts/` layer files (flat, shared scope _within_ that module). The five
verbs exist, with identical meaning, at every level.

```
justfile (root entry) ──────────────── set shell nu · dotenv · mods · imports
├── mod client → src/client/client.just ── imports src/client/scripts/*.just
├── mod server → src/server/server.just ── imports src/server/scripts/*.just
│   ├── mod db     → db/db.just          (leaf, single file)
│   ├── mod engine → engine/engine.just  (leaf, single file)
│   ├── mod rpc    → rpc/rpc.just        (leaf, single file)
│   └── mod tests  → tests/tests.just    (leaf, single file)
├── mod cli → src/cli/cli.just ────────── imports src/cli/scripts/*.just
└── import scripts/{_shared,dev,check,test,ci,deploy}.just
```

**Why `mod` between levels, `import` within a level:** client/server/cli are
independent sub-projects with colliding verb names — `mod` gives each its own
namespace and working directory, so `client::fmt` and `server::fmt` coexist.
Within one level, the six layer files are one logical justfile split _by
audience_ — `import` merges them into a single flat verb surface sharing that
level's settings. Mixing the two the other way (imports across levels) would
force `allow-duplicate-recipes` and last-write-wins ambiguity; recursive
`just -f` (the current mechanism) loses static verification, dependency
deduplication, and correct error propagation. Verified: an _imported_ layer file
may declare dependencies on _module_ recipes (`fmt: client::fmt`) because
`import` shares the root's scope where the `mod`s are declared.

### 2.2 Invocation grammar (the consumer contract)

- `just` → grouped menu (the `list` front door, `[default]` at every level).
- `just check` / `just ci` → repo-wide; `just client::check`,
  `just server::rpc::test` → scoped. Space form (`just server rpc test`) works
  identically.
- `just --list` at any level shows that level's verbs plus its submodules.

**Why this is the 10-year bet:** forks accrete languages and services; verbs
must not. A consumer who learns `check`/`test`/`ci` on day one never relearns
anything — new components slot in as one more module fanned into the same verbs.
The alternative (per-tool recipe names like `clippy`, `svelte-check`, `govet`)
decays into a trivia quiz by year 3.

### 2.3 The composition ladder & the write/read law

At every level: `check = fmt + lint + types` (the **make-it-right button — it
writes**: `fmt` rewrites files); `test` **only reads** (proves behavior);
`ci = check + test`. Form-correctness and behavior-correctness fail for
different reasons and must stay independently invokable. Aggregation direction
is strictly downward (root depends on `client::…`; a child never references its
parent) — this keeps every module independently runnable
(`just -f src/server/engine/engine.just check` works standalone), which is what
makes components extractable from the template later.

### 2.4 The settings-isolation law (load-bearing; verified)

`set shell` does **not** propagate into `mod` submodules — each module runs the
default `sh -cu` unless it declares its own shell. Consequence, non-negotiable:
**all nine entry files** (root `justfile`, `client.just`, `server.just`,
`cli.just`, `db.just`, `engine.just`, `rpc.just`, `tests.just` — plus none of
the imported layer files, which inherit their module's scope) **open with
`set shell := ["nu", "-c"]`.** Same isolation applies to `set dotenv-load`:
declared in the root `justfile` (for root-level recipes) **and** in
`server.just` (server components consume `.env`/`.env.example` values; relying
on cross-module inheritance would silently fail).

---

## 3. Patterns & Standards (enforced across every file this plan touches)

1. **Five-verb harness (verbs fixed, tools swapped).** Every level exposes
   `fmt`, `lint`, `types`, `check`, `test`; aggregate levels add `ci`;
   `dev`-layer verbs (`run`, `build`, level extras) and `deploy` complete the
   surface. _Protects against:_ per-tool naming drift (year 3), onboarding cost
   per fork (year 5), harness rewrites when a language is swapped (year 10 — one
   recipe line changes, the verb survives).
2. **Layer files split by audience, not topic.** `dev.just` = human tight loop ·
   `check.just` = fix/writes · `test.just` = prove/reads · `ci.just` = automate
   · `deploy.just` = ship · `_shared.just` = front door + privates. A recipe's
   file answers "who runs this, when".
3. **Compose up, never re-list.** A higher verb _depends on_ lower verbs
   (deduplicated, ordered, statically resolved). A recipe body never
   re-implements another recipe's steps and never invokes `just` recursively —
   the one historical exception (`rpc test-all` calling bare `just test`)
   actually resolved to the **root** justfile via upward file discovery (rpc/
   has no file literally named `justfile`), silently running the wrong recipe;
   dependencies make this class of bug unrepresentable.
4. **Nu recipe idioms.** Each plain recipe line is one fresh `nu -c` process —
   no shell state across lines. Multi-statement logic uses a `#!/usr/bin/env nu`
   shebang body (one process). Environment for one command:
   `with-env {VAR: "val"} { cmd }` — never bash `VAR=val cmd` prefixes.
   Pipelines over loops; `for` only for pure side effects (the sanctioned escape
   hatch). External output is structured at the edge (`| lines | where …`).
5. **Backtick assignments and parameter defaults now execute under nu.** Any
   backtick whose output was a bash word-list (e.g. the old `app=`ls apps/``)
   would now yield a rendered nu _table_ — semantically broken. Rule: backtick
   defaults must produce a single plain string, or be replaced by a literal
   default.
6. **Honest-stub policy.** A verb whose implementation is impossible today
   (missing compose file, missing script) keeps its name and raises a structured
   error (`error make`) whose message names the missing precondition; a
   `# todo:`-style doc comment above it states what the implementation must do.
   _Why not delete:_ the verb surface is the template's documentation of intent.
   _Why not fake-succeed:_ a green lie in `check`/`deploy` is the worst failure
   mode a template can teach. **Exception — `src/cli`:** its recipes are quiet
   no-ops (a `@echo` noting "cli crate not implemented; will run
   `<future command>`") rather than errors, because cli verbs sit inside root
   composition chains (`fmt: … cli::fmt`) and an empty scaffold must not redden
   the whole repo's `ci`.
7. **Discoverability invariant.** `list` is `[default]` at every level; public
   verbs are flat and `[group(…)]`-tagged (`check`, `dev`, `test`, `ci`,
   `deploy`, `meta`); helpers get leading `_` + `[private]`. Group tags are
   lowercase, matching the layer file name — the menu then reads as the
   architecture.
8. **Echo truthfulness.** Success echoes state exactly what happened (the old "✓
   Server built successfully" after building client+server, and "✓ Tauri app
   built" from a compose call, are the anti-pattern). Prefer no echo — `just`
   already reports failures; decorative confirmations are noise that can lie.
9. **Comments explain why / what-must-exist, never restate the command.**

---

## 4. Component Map — every file, every recipe, with reasons

Legend: **(N)** new file · **(R)** rewritten in place · **(E)** edited
surgically · **(D→nu)** converted from shell to nushell. Recipe rows: _name
(params) · attributes · dependencies → body intent (exact tool invocation named
inline)_. Bodies stay single-line nu unless marked **shebang**.

### 4.0 Target tree (harness-relevant paths only)

```
template/
├── justfile                         (R)
├── scripts/
│   ├── _shared.just                 (N)
│   ├── dev.just                     (R)
│   ├── check.just                   (N)
│   ├── test.just                    (N)
│   ├── ci.just                      (R)
│   └── deploy.just                  (R)
├── README.md                        (E)
├── docs/todo.md                     (E)
├── src/
│   ├── client/
│   │   ├── client.just              (R → thin entry)
│   │   ├── flake.nix                (E)
│   │   └── scripts/{_shared,dev,check,test,ci,deploy}.just   (N ×6)
│   ├── cli/
│   │   ├── cli.just                 (N)
│   │   └── scripts/{_shared,dev,check,test,ci,deploy}.just   (N ×6)
│   └── server/
│       ├── server.just              (R → thin entry)
│       ├── pkgs.nix                 (E)
│       ├── scripts/{_shared,dev,check,test,ci,deploy}.just   (N ×6)
│       ├── db/
│       │   ├── db.just              (R)
│       │   ├── db.Dockerfile        (E)
│       │   └── scripts/entrypoint.nu, init-db.nu             (D→nu; .sh deleted)
│       ├── engine/engine.just       (R)
│       ├── proto/buf.gen.yaml       (E)
│       ├── rpc/
│       │   ├── rpc.just             (R)
│       │   ├── go.mod               (E)
│       │   └── tests/grpcurl.nu     (D→nu; .sh deleted)
│       └── tests/tests.just         (R — rewritten from scratch)
```

### 4.1 Root `justfile` (R)

Thin entry, in order: `set shell := ["nu", "-c"]` (D4) · `set dotenv-load`
(moved here from the old `scripts/dev.just` — settings belong in the module's
entry, not hidden in a layer file) · `mod client 'src/client/client.just'` ·
`mod server 'src/server/server.just'` · `mod cli 'src/cli/cli.just'` (new mount
— cli finally wired in) · six imports of `scripts/*.just` in layer order
(`_shared`, `dev`, `check`, `test`, `ci`, `deploy`). The old commented-out
`list` todo block is deleted — `_shared.just` now answers it (yes, it was
useful; it becomes the `[default]`).

### 4.2 Root `scripts/` — repo-wide verbs by pure fan-out

Root bodies contain **no tools**, only composition — the root's entire job is
aggregation, so any tool named here would be a layering violation.

**`_shared.just` (N)** — `list · [default] [group('meta')]` →
`@just --list --unsorted`. Doc comment notes `just --list --list-submodules` for
the fully expanded menu. No project vars yet — none are consumed; adding
speculative `PROJECT`/`VERSION` violates simplicity-first.

**`check.just` (N)** — all `[group('check')]`:

- `fmt: client::fmt server::fmt cli::fmt` (empty body — dependencies are the
  recipe).
- `lint: client::lint server::lint cli::lint`.
- `types: client::types server::types cli::types`.
- `check: fmt lint types` — the umbrella is composition, never a fourth tool.

**`test.just` (N)** —
`test · [group('test')]: client::test server::test cli::test`. Doc comment:
server tests require live services (pre-existing contract, unchanged).

**`dev.just` (R)** — `[group('dev')]`:

- `run: client::run` — preserves the old file's semantics (the server line was
  deliberately commented out); doc comment states the server stack is run
  per-component during development (`just server::db::run`, etc.) and why root
  `run` is client-only for now.
- `build: client::build server::build cli::build` — **moved here from
  `deploy.just`**: build is a dev-loop verb; deploy ships artifacts (D5 layer
  law). The lying "✓ Server built successfully" echo is deleted (§3.8).

**`ci.just` (R)** — `[group('ci')]`:

- `ci: check test` — the one thing a PR must pass. Replaces the commented-out
  block that referenced nonexistent `build-all`/`test-all`.
- `commit msg: ci` → body: `git add -A`, then `git commit -m "{{msg}}"` (quoted
  — messages contain spaces). Part of the house harness: never commit a red
  tree.

**`deploy.just` (R)** — `deploy · [group('deploy')]` → honest stub: `error make`
stating that root deploy means bringing up the full stack via podman compose and
is blocked on the root compose rewrite tracked in `docs/todo.md` (D6). Doc
comment carries the same intent in one line. All the old commented Tauri/GCloud
noise is deleted — intent now lives in one stub + todo entry instead of three
duplicate `# todo` triplets.

### 4.3 `src/client/` — deno-only client harness

**`client.just` (R → thin entry)** — header comment renamed to `GWA · Client`
(D10) · `set shell := ["nu", "-c"]` · six imports of `scripts/*.just`. Nothing
else — every recipe moves into its layer file.

**`scripts/_shared.just` (N)** — `list` `[default]`, as root.

**`scripts/check.just` (N)** — all `[group('check')]`:

- `fmt:` → `deno fmt .`
- `lint:` → `deno lint .`
- `types:` → two lines, each a self-contained nu statement (fresh shell per
  line):
  `cd apps/vision; deno run -A npm:svelte-check --tsconfig ./tsconfig.json` and
  `cd sdk/ui; deno run -A npm:svelte-check`. **No `-` sigils** (D8): the old
  recipe ignored every failure, making the client gate un-failable. **[RISK —
  expected]** this may go red on real pre-existing type errors; that is the gate
  _working_. Report such errors; do not mask them and do not fix app code in
  this pass. The old commented `apps/explorer` lines and the sdk-ui todo comment
  are dropped (explorer doesn't exist; the sdk line is now live).
- `check: fmt lint types` — was `quality: typecheck`; the rename plus full
  composition is the fix to the harness's original sin.

**`scripts/dev.just` (N)** — `[group('dev')]`:

- `sync-ui:` → two lines:
  `deno run -A npm:@inlang/paraglide-js compile --project ./sdk/ui/src/i18n/project.inlang --outdir ./sdk/ui/src/i18n/paraglide`
  (replaces `bunx`, D7) and `cd sdk/ui; deno run -A npm:svelte-kit sync`
  (replaces `bun run --cwd` — this exact deno form already existed as a
  commented line in the old file; we adopt the file's own precedent).
- `run app='vision': · [working-directory('apps')]` →
  `cd {{ app }}; deno run -A npm:vite dev`. The old backtick default
  `` `ls apps/` `` is replaced by the literal `'vision'` because under nu the
  backtick yields a rendered table, not a word (§3.5); with one app, a literal
  is also simpler.
- `preview app='vision': (build app) · [working-directory('apps')]` →
  `cd {{ app }}; deno run -A npm:vite preview`. Same default rationale.
- `build app='': sync-ui` → **shebang** nu body. Contract (doc comment states
  it): if `app` is empty, build every directory under `apps/`; else build only
  `apps/<app>`. Shape: an `if` on `"{{ app }}"` emptiness; the all-apps branch
  is a `for` over `ls apps | get name` that enters each dir, runs
  `deno run -A npm:vite build`, and returns (`cd -`) — `for` is the sanctioned
  side-effect escape hatch, and a shebang is mandatory because `cd` state must
  persist across statements.
- `pwa-check:` → honest stub (D5): `error make` with message "pwa-check not
  implemented — expected script src/client/scripts/pwa-check.nu is missing". Doc
  comment states what the future **nushell** script must do (verify manifest,
  service worker, installability flags) — per the decision: keep the verb,
  document the contract, target `.nu` not `.sh`. The old
  `sh ./scripts/pwa-check.sh` call (missing file, wrong language) is gone.

**`scripts/test.just` (N)** — `test · [group('test')]` → `deno test -A`
(replaces `bun test`, D7). Doc comment: zero client test files exist today; the
verb passes vacuously and is wired so root `ci` exercises it the day the first
test lands.

**`scripts/ci.just` (N)** — `ci · [group('ci')]: check test`.

**`scripts/deploy.just` (N)** — `deploy · [group('deploy')]` → honest stub:
`error make` stating client deploy means Tauri/podman packaging and is blocked
on both the Tauri config and a client compose file (neither exists — the old
recipe ran `podman-compose` in a directory with no compose file and then claimed
a Tauri build). Doc comment: deploy = podman/shipping; the local loop lives in
`dev.just` (Internals decision 4).

### 4.4 `src/cli/` — scaffold with a real verb surface

**`cli.just` (N)** — `set shell := ["nu", "-c"]` + six imports. **`scripts/` (N
×6)** — same six files; every recipe is a quiet no-op `@echo` naming itself
skipped, with a doc comment stating the future body (`cargo fmt --all` /
`cargo clippy --all-targets --all-features` / `cargo check --all-targets` /
`cargo test` / `cargo build` / `cargo run` respectively; `check: fmt lint types`
and `ci: check test` compose normally even over no-ops). _Why no-ops, not
errors:_ cli verbs are inside root composition chains; an empty scaffold must
not fail repo `ci` (§3.6 exception). _Why scaffold at all:_ D1 — the four trees
are structurally identical, so promoting cli from empty stub to real crate is a
bodies-only change, never a harness change. `_shared.just` gets the `list`
default like every level.

### 4.5 `src/server/` — aggregate of four leaf modules

**`server.just` (R → thin entry)** — `set shell := ["nu", "-c"]` ·
`set dotenv-load` (server components read `.env`; declared here because module
settings never inherit, §2.4) · `mod db "db/db.just"` ·
`mod engine "engine/engine.just"` · `mod rpc "rpc/rpc.just"` ·
`mod tests "tests/tests.just"` · six imports of `scripts/*.just`. Every old
inline recipe moves into layers.

**`scripts/check.just` (N)** — `fmt: db::fmt engine::fmt rpc::fmt tests::fmt`;
`lint:` and `types:` same fan-out; `check: fmt lint types`. Pure composition
(replaces four `just -f` bodies each).

**`scripts/test.just` (N)** —
`test: db::test engine::test rpc::test tests::test`. The old inline `vite-plus`
call (and its `[working-directory("tests")]` + error-swallowing `-` prefix) is
deleted from this level: the cross-service suite is `tests::test`'s job, and it
must be allowed to fail. Doc comment preserves the old file's guidance that
suites can be run individually (`just server::tests::test`) and that
db/engine/rpc must be live for integration paths — orchestration is deliberately
unchanged in this pass.

**`scripts/dev.just` (N)** — `run: db::run engine::run rpc::run` (doc comment:
sequential and blocking exactly as before — `db::run` attaches to compose;
preserved semantics, flagged, not redesigned) ·
`build: db::build engine::build rpc::build`.

**`scripts/ci.just` (N)** — `ci: check test`. **`scripts/deploy.just` (N)** —
honest stub: `error make` stating server deploy means shipping the podman stack
and is blocked on the compose consolidation (D6/D5). **`scripts/_shared.just`
(N)** — `list` default.

### 4.6 Leaves — canonical verbs, nu shell, one file each

Every leaf opens with `set shell := ["nu", "-c"]` (§2.4) and exposes
`fmt`/`lint`/`types`/`check`/`test` so the parent fan-out resolves statically.
Groups re-tagged to `check`/`dev`/`test` (lowercase, §3.7).

**`db/db.just` (R)** — `fmt`/`lint`/`types`: remain quiet no-op echoes, now with
the honest reason as a doc comment: no SurrealQL formatter/linter is adopted;
the placeholders exist purely to keep the verb surface uniform so parent
composition never special-cases db. `check: fmt lint types` (new umbrella —
consistency fix). `build:` → `podman-compose down -v` then
`podman-compose build --no-cache` (unchanged; plain args are nu-safe).
`run: build` → `podman-compose up`; the unreachable "✓ DB running" echo after a
blocking command is deleted (§3.8). `down:` unchanged. `test:` /
`test-one FILE:` / `test-report:` → hurl invocations unchanged
(`hurl --test --variables-file tests/.env --user root:root tests/*.hurl`, etc. —
the glob expands via nu, which globs bare `*.hurl` in external-command position;
verify in Phase 1 smoke, and if nu's glob handling surprises, wrap as an
explicit `(glob tests/*.hurl)` spread — the contract, "run all hurl files under
tests/", is what's fixed).

**`engine/engine.just` (R)** — `fmt:` `cargo fmt --all` · `lint:`
`cargo clippy --all-targets --all-features` · `types:`
`cargo check --all-targets` (rename from `typecheck`; the just-skill's canonical
Rust mapping) · `check: fmt lint types` (new) · `build:`
`cargo build -p gateway` · `run:`
`with-env {RUST_LOG: "debug"} { cargo run -p gateway }` — replaces the
bash-shaped `RUST_LOG=debug …` prefix with the explicit nu idiom (§3.4); doc
comment: run the gateway with debug logging · `test:` `cargo test --workspace`.

**`rpc/rpc.just` (R)** —

- `fmt:` `go fmt ./...` · `lint:` `go vet ./...` · `types:` `go build ./...` ·
  `check: fmt lint types` (renames the old `quality` — D3).
- `generate:` → one nu line: change dir to `../proto`, then `with-env`
  prepending `../tests/node_modules/.bin` to `$env.PATH` (a **list** in nu —
  `prepend`, not string concatenation) around `buf generate`. Doc comment states
  why the PATH surgery exists: buf's `local:` TS plugins resolve from the tests
  workspace's node_modules.
- `build: generate` → `go build -o target/rpc ./cmd/server` · `run:`
  `go run ./cmd/server`.
- `test:` → nu pipeline replacing
  `$(go list ./... | grep -v templatev1connect)`: spread the filtered package
  list into the external call —
  `^go test ...(^go list ./... | lines | where {|l| not ($l | str contains "templatev1connect")}) -count=1`-shaped;
  doc comment: generated connect stubs are excluded because they carry no tests
  worth compiling repeatedly.
- `test-smoke:` → `nu tests/grpcurl.nu` (D9).
- `test-all: test test-smoke` with **empty body** — the decisive bug fix: the
  old body called bare `just test`, and since `rpc/` contains no file literally
  named `justfile`, discovery walked up and executed the **root** `test`.
  Dependencies make the composition static and correct. Doc comment records this
  exact failure mode so it is never reintroduced.

**`tests/tests.just` (R — from scratch, [ASSUMPTION §1.3])** — `fmt:`
`deno fmt .` · `lint:` `deno lint .` · `types:` quiet no-op with doc comment:
the suite's imports resolve through npm/node_modules without a deno.json import
map, so `deno check` cannot resolve them today; type safety is enforced by
vite-plus at run time; revisit when an import map lands ·
`check: fmt lint types` · `test:` `deno run -A npm:vite-plus/vp test` (doc
comment lists the sub-suite invocations from the old server.just comments:
`… test integration/db unit/db`, `integration/engine`, `integration/rpc`,
`e2e`).

### 4.7 Auxiliary scripts → nushell (D9) + container plumbing

**`db/scripts/entrypoint.nu` (D→nu; delete `entrypoint.sh`)** — Contract
preserved: start SurrealDB with env-derived flags
(`SURREAL_LOG/USER/PASS/PORT/PATH`, defaults matching the old script via
`$env.X? | default`), optionally seed when `SEED_ON_START` is true, keep the
container alive on the surreal process. **Design inversion, with reason:** the
sh version backgrounded surreal (`&`) and `wait`ed on its PID; the nu port
instead spawns the _seeding_ side as a background job (`job spawn`: poll
readiness with a bounded retry pipeline against the local endpoint, then invoke
`/scripts/init-db.nu`) and runs `surreal start …` in the **foreground** as the
container's main process. This is cleaner under nu's job model and strictly
better container semantics: PID-1 lifetime, signals, and exit code belong to the
database itself. House idioms apply: typed `def`s, tiny helpers, pipeline retry
over a counter loop.

**`db/scripts/init-db.nu` (D→nu; delete `init-db.sh`)** — Contract preserved:
provision namespace+database, then execute every `.surql` under `/init/**` in
path order (the numeric prefixes `01-schema … 05-seed` are the ordering contract
— sort lexically), printing per-file ✓/✗ and aborting non-zero on the first
`"status":"ERR"`. Port rules: HTTP via nu's built-in `http post` with basic auth
(replaces curl — structured JSON comes back as data, so the error check becomes
a real predicate over the parsed response instead of `grep` on text); file
discovery via `glob /init/**/*.surql | sort`; each statement batch is the
`USE NS …; USE DB …;` preamble prepended to the file's raw content, exactly as
before; colors via nu's `ansi` command (drop the hand-rolled escape variables);
helpers are typed `def`s (`run-surql [file: path]` returning a record),
`def main` drives.

**`db/db.Dockerfile` (E)** — three surgical edits: (1) add a `COPY --from=` line
pulling the `nu` binary from the pinned nushell bookworm image into `/bin/nu`,
mirroring the existing surreal-binary copy pattern (same base OS ⇒ same glibc
compatibility argument) — **[ASSUMPTION §1.3]**, pin the tag, verify the source
path once; (2) update the `chmod +x` line to the two `.nu` filenames; (3)
`ENTRYPOINT ["/bin/nu", "/scripts/entrypoint.nu"]` — explicit interpreter rather
than shebang reliance, because `/usr/bin/env` resolution inside slim images is
exactly the kind of implicit dependency this plan removes.
`COPY scripts/ /scripts/` is unchanged (it now carries `.nu` files).

**`rpc/tests/grpcurl.nu` (D→nu; delete `grpcurl.sh`)** — Contract preserved
step-for-step: resolve to the rpc dir (script-relative via `$env.FILE_PWD`-based
path, replacing `cd $(dirname $0)/..`); load `../.env` if present by parsing
`k=v` lines (skip comments) into the environment — a nu parse pipeline replaces
the fragile `export $(grep -v '^#' … | xargs)`; read `PORT_RPC`/`JWT_SECRET`
with the same defaults; mint the token by invoking
`go run ./tests/bin/mint-token` under `with-env` (**[ASSUMPTION §1.3]** —
missing binary must fail loudly, which nu's default external-failure abort
provides for free); run the five numbered checks with grpcurl unchanged (grpcurl
stays — no Rust replacement speaks gRPC health/reflection); the
**expected-failure** step (unauthenticated rejection) wraps its call in
`do { … } | complete` and asserts on captured stderr/exit-code — the
nu-idiomatic replacement for the `set +e`/`set -e` dance; the pre-flight
`command -v grpcurl` check is dropped (stack rule: tools are assumed present;
recipes never check for or fall back from them).

### 4.8 Toolchain & naming edits

**`src/server/pkgs.nix` (E)** — add `nushell` to the `base` group with a
why-comment: every justfile sets nu as its recipe shell, and modules don't
inherit settings, so nu must exist in _every_ dev shell that runs `just` (base
is exactly that set). All server-side flakes (`server`, `db`, `engine`, `rpc`,
`tests`, `proto`) inherit it through `groups.base`.

**`src/client/flake.nix` (E)** — packages: add `deno` (recipes are now deno-only
and it was **never in the shell** — the old harness only worked because bun
happened to be there) and `nushell`; **remove `bun`** (this change makes it
recipe-unused; removing our own now-dead dependency is in-scope cleanup); keep
`just`, `nodejs` (its "peer requirement" comment still holds for npm-sourced
vite deps), `podman`, `podman-compose`. Update the shellHook version echo from
bun's version to deno's (`deno --version | lines | first`-shaped) so the
greeting doesn't reference a removed tool. Root `flake.nix` needs nothing — it
composes client+server shells via `inputsFrom`.

**Go module rename `argus-rpc` → `gwa-rpc` (D10) [HIGH RISK — hard to revert
piecemeal; do atomically in one commit]:**

1. `src/server/rpc/go.mod`: module line → `gwa-rpc`.
2. Sweep hand-written Go sources (everything under `src/server/rpc` **excluding
   `gen/`**): replace the import prefix `argus-rpc` → `gwa-rpc` and the local
   alias `argusGrpc` → `gwaGrpc`. Tooling per stack rules:
   `fd -e go . src/server/rpc --exclude gen` piped to `sd`.
3. `src/server/proto/buf.gen.yaml`: managed override `go_package_prefix` value →
   `gwa-rpc/gen`.
4. Regenerate: `just server::rpc::generate` — the `gen/` tree (whose `.pb.go`
   headers embed the old package path) is rebuilt, never hand-edited.
5. Boundary (restated): `XIBALBA_CORE_OS`-style strings inside Svelte components
   are app copy owned by the existing docs "Semana 8" trim — untouched.

**`README.md` (E)** — fix the three stale commands only: `just server proto` →
`just server::rpc::generate` · `just dev` → `just run` · `just server quality`
(and its parenthetical) → `just server::check` — "fmt + lint + types". No other
prose touched.

**`docs/todo.md` (E)** — fix `just tests::test` → `just server::tests::test`;
rephrase `just proto:check` to name it as a _future_ rpc drift-check recipe (it
never existed; a fake fix would repoint to a verb with different semantics);
append one reminder item (D6): root `docker-compose.yml` targets a previous
architecture (Python `server/api`, `app.Dockerfile`, postgres volume) and mounts
a nonexistent `traefik.yml` — rewrite against the real stack before root/server
`deploy` can graduate from stub.

---

## 5. Trade-off Record

```
DECISION: Inter-level composition mechanism
OPTIONS:  A. mod + module-recipe dependencies — static resolution, dedup, per-module cwd,
             namespaced verbs / requires modern just
          B. recursive `just -f` bodies (status quo) — no version constraint / no static
             checking, re-spawns just per call, caused the rpc test-all misdiscovery bug
          C. import everything flat — one namespace / verb-name collisions force
             allow-duplicate-recipes, last-write-wins ambiguity
CHOSEN:   A (verified empirically on just 1.55.1, including deps declared in imported files)
REVISIT IF: a consumer must support just < ~1.30 era binaries (then B per-call shims).
```

```
DECISION: Recipe shell
OPTIONS:  A. nu everywhere, declared per entry file — one scripting model, structured
             pipelines, matches house stack / must rewrite 4 bash-shaped bodies, nu must
             exist in every shell and the db image
          B. nu at aggregate levels only — smaller blast radius / two shell dialects
             forever, the exact class of drift this work removes
CHOSEN:   A. Container-internal reality is handled by shipping nu in the image, not by
          keeping sh.
REVISIT IF: never, for this repo — nu is a stack invariant.
```

```
DECISION: Empty-cli recipes
OPTIONS:  A. error-make stubs — maximally loud / redden root ci while the crate is empty
          B. quiet no-ops with future-command comments — root ci stays green, intent documented
CHOSEN:   B for cli (inside composition chains); A for deploy/pwa-check (leaf verbs whose
          "success" would be a lie).
REVISIT IF: the cli crate lands — bodies swap to the commented cargo commands, harness untouched.
```

```
DECISION: db container scripts
OPTIONS:  A. keep .sh (containers lack nu) — zero image change / permanent stack exception
          B. port to .nu + ship nu binary in image — one stack, structured JSON handling in
             init / adds one COPY layer and an image-source assumption
CHOSEN:   B (user override of the original keep-sh flag), with a pinned-tag + verified-path
          discipline and a musl-release fallback.
REVISIT IF: image size or the ghcr source becomes a problem → fallback stage.
```

```
DECISION: Verb vocabulary
OPTIONS:  A. canonical fmt/lint/types/check/ci — matches the skill, one contract per fork
          B. keep typecheck/quality — no retraining cost today
CHOSEN:   A. The template's product is the contract; incumbent names lose at year 3.
REVISIT IF: never — this is the point of the exercise.
```

---

## 6. Phased Implementation Plan

Bottom-up, because parents reference child verbs statically: a root
`fmt: client::fmt …` cannot parse until every child exposes
`fmt`/`lint`/`types`. Each phase leaves the repo runnable.

**Phase 0 — Toolchain floor.** Build: `pkgs.nix` (+nushell in base) · client
`flake.nix` (+deno +nushell −bun, shellHook echo). Exit criteria: `nix develop`
in root, `src/client`, `src/server` each expose `nu` and (client) `deno` on
PATH; nothing else changed. Risk: none — additive shell contents.

**Phase 1 — Leaves canonicalized.** Build: `db.just`, `engine.just`, `rpc.just`,
`tests.just` per §4.6 (nu shell, `types`/`check` verbs, rpc `generate` nu PATH
surgery, `test-all` dependency fix, tests file from scratch). Exit criteria: for
each leaf, `just -f <file> --list` parses and shows `fmt lint types check test`;
`just -f engine/engine.just check` and `just -f rpc/rpc.just check` exit 0;
`just -f rpc/rpc.just -n test-all` dry-run prints its two sibling recipes
(proving the discovery bug is dead); `just -f tests/tests.just -n test` prints
the vite-plus invocation. Risk: nu-vs-glob behavior in db's hurl recipes — smoke
`just -f db/db.just -n test` and adjust the glob form within the stated contract
if needed. **[REVISIT]** flagged in §4.6.

**Phase 2 — The four harness trees.** Build: root `justfile` + `scripts/` ×6 ·
`client.just` + `scripts/` ×6 · `server.just` + `scripts/` ×6 · `cli.just` +
`scripts/` ×6, per §4.1–4.5. Delete nothing else; old monolith recipe content is
subsumed, old files rewritten in place. Exit criteria: `just --list` at root
shows the verb groups plus modules `client server cli`; `just -n check` and
`just -n ci` resolve every dependency statically with zero unknown-recipe
errors; `just fmt` exits 0; `just check` runs — if `client::types` reds on
genuine pre-existing type errors, that is a **pass** for this phase (the gate
now tells the truth; report the errors, do not fix app code); `just client`,
`just server`, `just cli` each print their module menu via the `[default]` list.
Risk: any missed bashism now fails at _runtime_, not parse time — mitigated by
the Phase-2 rule: dry-run (`-n`) then execute every public verb at every level
once.

**Phase 3 — Nu script ports + container.** Build: `entrypoint.nu`, `init-db.nu`,
`grpcurl.nu` per §4.7 (delete the three `.sh`); `db.Dockerfile` edits. Exit
criteria: `nu --ide-check 0 <script>` clean for all three; `podman build` of the
db image succeeds; `just server::db::run` boots, and logs show the per-file ✓
seed lines followed by a serving database; with it live, `just server::db::test`
(hurl) is green — the strongest possible proof the seeding port is
byte-equivalent; `just server::rpc::test-smoke` executes `grpcurl.nu` end-to-end
against a running sidecar (or fails precisely at the mint-token assumption,
loudly, per §1.3). Risk: **[ASSUMPTION]** nushell image path/tag — verify before
wiring; fallback stage documented in §4.7. This phase is independently
revertible (git holds the `.sh` files).

**Phase 4 — Renames + docs.** Build: go-module rename sweep + buf regen per §4.8
(one atomic commit, [HIGH RISK] flag honored); `client.just` header (already
done in Phase 2 — verify); README + `docs/todo.md` edits. Exit criteria:
`just server::rpc::check` (which is `go build ./...` under `types`) green
post-rename; `rg -i argus src/server/rpc` returns zero hits including `gen/`;
`rg -i xibalb src/client/client.just` zero; every command named in README
executes as written from repo root; `docs/todo.md` carries the compose reminder.
Risk: regeneration drift if buf plugins moved — the `generate` recipe from Phase
1 is the single regeneration path; never hand-edit `gen/`.

---

## 7. Sequencing, Critical Path, Breaking Changes

- **Dependency graph:** P0 → P1 → P2 → (P3 ∥ P4). P3 and P4 are independent of
  each other; both need P1 (P3 needs `rpc.just test-smoke` wiring and `db.just`;
  P4 needs the `generate` recipe).
- **Critical path:** P1. Every parent verb resolves against leaf verb names; any
  leaf that ships `typecheck` instead of `types` breaks root parsing for the
  whole repo. Do leaves completely, verify their `--list` surfaces, then ascend.
- **Breaking changes (announce in the commit messages):** verb renames
  `typecheck→types`, `quality→check` (any human muscle memory, any external
  caller, any doc not in this plan's edit list); Go module path
  `argus-rpc→gwa-rpc` (breaks any out-of-tree import — none known for a
  template, but flagged); recipe shell flip (any local uncommitted justfile
  snippets written for bash die).
- **Integration points:** `buf.gen.yaml ↔ go.mod ↔ gen/` (one atomic commit,
  regenerate-don't-edit); `db.Dockerfile ↔ scripts/*.nu` (ENTRYPOINT path and
  chmod list must match the new filenames);
  `pkgs.nix base ↔ every set shell line` (nu must exist wherever just runs).

---

## 8. Validation & Testing Strategy

| Layer                                | Check                                                                                                                   | What it proves                                                         |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Justfile syntax                      | `just -f <file> --list` for all 9 entries + dry-run `-n` of every public verb                                           | parse-time correctness; all module/dep references resolve              |
| Verb-surface uniformity (fitness fn) | `just --summary` per module must contain `fmt lint types check test` — scriptable as a nu pipeline over the module list | the contract of §2.2 holds at every level, forever                     |
| No silent failure (fitness fn)       | `rg '^\s*-' */scripts/check.just src/*/scripts/check.just` → zero hits                                                  | no check-family recipe ignores errors (D8 stays fixed)                 |
| No shell backsliding (fitness fn)    | `rg 'bash                                                                                                               | sh -c                                                                  |
| Nu scripts                           | `nu --ide-check 0` on all three ports                                                                                   | parse-level correctness before any container build                     |
| Seeding equivalence                  | Phase-3 exit: image boots + full hurl suite green                                                                       | the `.nu` init port is behaviorally identical to the `.sh` it replaced |
| Rename integrity                     | `go build ./...` + `rg -i argus` zero                                                                                   | no half-renamed import graph                                           |
| Docs                                 | execute every README command verbatim from repo root                                                                    | documentation and harness cannot drift silently in this pass           |
| Local dev loop                       | a contributor runs `just` → picks a verb from the menu → `just ci` before committing (`just commit "msg"` enforces it)  | the harness is its own onboarding                                      |

**Observability of the harness itself:** none needed beyond just's own echo/exit
behavior — by design every recipe line is visible unless deliberately
`@`-quieted, and the fitness functions above are one-liners a future CI workflow
will run the day it exists (explicitly deferred, §1.4).

---

_Assumptions are inline-flagged (§1.3). Decisions are recorded (§1.2, §5).
Out-of-scope is explicit (§1.4). No open questions remain by construction —
anything unresolved was converted into a flagged assumption with a stated
fallback._
