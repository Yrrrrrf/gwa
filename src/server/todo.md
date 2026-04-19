# Template Server — Microkernel Finalization Plan

**Spec Version**: 2.0 (supersedes v1.0 integration plan)
**Date**: 2026-04-18
**Status**: Phases 1–3 complete; Phases 4–6 ready for execution
**Reference**: Working stack from `server.md`, validated by `server-test.md`, wired by v1.0 plan through the preflight check. This revision closes the gap to a genuinely zero-boilerplate template.

---

## 0. Executive Summary

The server is now wired correctly at the data plane: schema bugs are fixed, the Rust engine and Go sidecar can be started, the preflight check accurately reports service health, and the Deno suite produces readable errors when services are down. What remains is committing to a specific **dev-environment philosophy** and making the template strict enough that a fresh clone needs zero hand-tuning. This revision pivots Phase 4 from containerization-for-CI to **microkernel-via-Nix**: `nix develop` is the runtime shell, `podman` is used for exactly one thing (the stateful SurrealDB), and every other process (engine, sidecar, tests) runs as a native process in the Nix shell. Phase 5 replaces the former CI workflow with an exhaustive **architecture fitness suite** that enforces every architectural rule as a shell-level check — hexagonal purity, microkernel boundaries, test isolation, proto contract, template cleanliness. Phase 6 is the final polish for a true template: a cleanup checklist for people cloning it, a `doctor` recipe for diagnosing setup issues, and no lingering shell scripts, stub Dockerfiles, or boilerplate that the template user would have to delete. When this plan lands, `nix develop && just server run` (terminal 1), `just server test` (terminal 2), green, done.

---

## 1. Context & Constraints

### Current State (after Phases 1–3)

- ✅ **Schema fixed**: `references<session>` on user enables CASCADE, role enum aligned, missing User fields defined.
- ✅ **Orchestration working**: `just server run` is capable of starting all three services (a real shell trap supervisor exists), and `just server down` tears them down.
- ✅ **Preflight working**: `just server test` runs `preflight.ts` first and clearly reports:
  ```
  🗄️  SurrealDB: ✅ UP (http://localhost:8000)
  🦀 Engine:    ❌ DOWN (http://localhost:3000)
  🐹 RPC:       ❌ DOWN (http://localhost:4000)
  ❌ Some services are unreachable. Run 'just server run' first.
  ```
  That's the exact UX we wanted — fail-fast, fail-readable, no stack trace.

### What's Left

- The test run above shows the preflight catching a real state (engine and RPC not yet auto-started by the new `run` recipe). Once `run` is finalized, this flips to all-green.
- Shell scripts from the legacy Phase 0 state still exist (`tests/fixtures.sh`, `tests/run-all.sh`, `tests/e2e/01-smoke.sh`, `tests/unit/01-schema.sh`, and any `scripts/run-stack.sh` left over from Phase 2) — these must all die. The suite is pure Deno now.
- The `just server run` recipe needs to be finalized to start all three services inline (no external shell script). The v1.0 plan left `scripts/run-stack.sh` as an escape hatch; we're closing that escape hatch.
- Phase 4 of the v1.0 plan was "Full Containerization for CI" — that's scrapped. Engine and RPC stay native (Nix-shell processes).
- Phase 5 of the v1.0 plan was GitHub Actions — also scrapped per user preference.
- Architecture fitness (formerly Phase 6) is now promoted to Phase 5 and expanded from 7 rules to a comprehensive enforceable suite.

### Goals — What "Done" Looks Like (v2.0)

1. `nix develop` gives a shell with every tool the server.just recipes need — no "install X manually first" step anywhere.
2. `just server run` starts all three services (DB in podman, engine via cargo, rpc via go) with a single command and a single Ctrl-C shutdown.
3. `just server test` runs preflight + full suite, all green.
4. `just server fitness` enforces every architectural rule declaratively and runs in under 5 seconds.
5. The only Dockerfile in the repo is `db/db.Dockerfile`. The only shell scripts are inside `db/scripts/` (container init only).
6. A new developer cloning the repo uses it as a template by: `nix develop`, `just server run`, `just server test`, then reading `TEMPLATE.md` to strip what they don't need. No boilerplate hunting.

### Team & Scale

Unchanged from v1.0. Solo dev, template-scale, local-only.

### Architectural Rules (revised)

- **Microkernel-via-Nix**: `nix develop` is the dev runtime. It is the "kernel" that hosts user-space processes (engine, rpc, tests). It must be self-sufficient.
- **Containers for state only**: Podman runs exactly one image: the SurrealDB container. No Dockerfile for engine. No Dockerfile for rpc. No compose file orchestrating multiple services.
- **No scripts outside `db/scripts/`**: Every `.sh` file outside of the DB container's init directory is forbidden. Orchestration lives in `server.just`. Test logic lives in `.test.ts` files. There is no third place.
- **No CI pipeline in this plan**: GitHub Actions is out of scope per explicit user preference. Fitness must be runnable locally and fast enough to run pre-commit.
- **Fitness is a hard gate**: Every architectural rule must be enforced by `just server fitness`. Aspirational rules in prose don't count. If it can't be checked, it doesn't exist.
- **Zero boilerplate in the template**: No commented-out TODO blocks. No placeholder Dockerfiles. No stub scripts that "will be used later." When a future dev clones the template, they should find only things that are actually used.
- **Justfile structure is canonical**: The current `server.just` layout (CI group, Build group, Dev group, Deploy group) is preserved. Additions are incremental (add `build-grpc`, finalize `run`).

### Out of Scope (v2.0)

- Production deployment (Cloud Run stays as a commented-out sketch).
- Containerization of engine/rpc (explicitly rejected — microkernel philosophy).
- GitHub Actions or any other CI pipeline.
- Observability stack (tracing + slog sufficient).
- Migration of the PostgREST-style `fetchTemplate` in the Go sidecar.
- gRPC vs Connect protocol spike if already resolved in Phase 3.

### Assumptions

- [ASSUMPTION] Phases 1–3 are complete and their exit criteria are met. In particular, `preflight.ts` exists and runs from `deno task test`.
- [ASSUMPTION] `tests/deno.json` has a `test` task that runs preflight first, then the suite.
- [ASSUMPTION] Any `scripts/run-stack.sh` created during Phase 2 exploration is still removable — no downstream consumer depends on it.
- [ASSUMPTION] The user has access to modify `flake.nix` and is comfortable adding language toolchains to it.
- [ASSUMPTION] `buf` CLI is the proto generator of choice; `proto/buf.gen.yaml` is already configured to emit Go code for the RPC sidecar.

---

## 2. Architecture Overview

### The Microkernel Analogy

```
  ┌────────────────────────────────────────────────────────────┐
  │                  Host OS (Linux / macOS)                   │
  │                                                            │
  │  ┌──────────────────────────────────────────────────────┐ │
  │  │              nix develop shell (THE KERNEL)          │ │
  │  │                                                      │ │
  │  │   cargo  │  go  │  deno  │  buf  │  just  │  curl   │ │
  │  │   podman-compose  │  protoc  │  xh                   │ │
  │  │                                                      │ │
  │  │   ┌────────────┐   ┌────────────┐  ┌─────────────┐  │ │
  │  │   │Rust Engine │   │ Go Sidecar │  │ Deno Tests  │  │ │
  │  │   │  :3000     │   │   :4000    │  │  (preflight │  │ │
  │  │   │ (cargo run)│   │  (go run)  │  │   + suite)  │  │ │
  │  │   └──────┬─────┘   └──────┬─────┘  └──────┬──────┘  │ │
  │  │          │                 │              │          │ │
  │  └──────────┼─────────────────┼──────────────┼─────────┘ │
  │             │                 │              │            │
  │             └────────┬────────┴──────────────┘            │
  │                      │                                    │
  │                      ▼ HTTP + WebSocket                   │
  │              ┌────────────────┐                           │
  │              │   podman       │                           │
  │              │   ┌──────────┐ │                           │
  │              │   │SurrealDB │ │  ← the ONLY               │
  │              │   │ :8000    │ │    "external module"      │
  │              │   │ (volume) │ │                           │
  │              │   └──────────┘ │                           │
  │              └────────────────┘                           │
  └────────────────────────────────────────────────────────────┘
```

**The analogy**: Just as a microkernel keeps only essentials in kernel space and pushes drivers/services to user space, this design keeps only the *stateful* service (the DB) in container space and runs everything else directly in the Nix shell. Engine and sidecar are "user-space processes" — ephemeral, stateless, directly observable, directly debuggable.

### Core vs. Supporting

- **Core deliverable of this plan**:
  - Phase 4: microkernel wiring (finalized flake.nix, finalized `run` recipe, removal of all stray shell scripts).
  - Phase 5: the comprehensive fitness suite.
- **Supporting**: template hygiene (TEMPLATE.md, `doctor` recipe, README rewrite).

---

## 3. Design Patterns & Code Standards

### 3.1 Microkernel via Nix — "The Shell IS the Runtime"

- **Pattern chosen**: Nix flake devShell as the authoritative runtime for all non-stateful services.
- **Why**: A template must be reproducible across dev machines without `brew install` chains, `asdf` plugins, or rustup/goenv/dvm instructions. The Nix flake expresses the full toolchain declaratively — one shell definition, every tool pinned, every version agreed on. Containerizing engine/rpc sounds safer but costs the dev loop dearly: a cargo-level rebuild that takes 2 seconds natively takes 5 minutes in a Dockerfile rebuild cycle. The microkernel split (DB containerized for state, everything else native in Nix) gives us reproducibility AND speed.
- **How it's applied**: `flake.nix`'s devShell lists every binary that any `server.just` recipe invokes, and every toolchain any service needs to build. When `nix develop` activates, the shell has `cargo`, `go`, `deno`, `buf`, `just`, `podman`, `podman-compose`, `protoc`, `curl`, `xh`, and `jq` all available. Services are started as foreground/background processes in this shell.
- **Standards enforced**: Every tool used by any recipe must be in the flake's packages list. Every system call that assumes a tool's presence must have an equivalent Nix entry. A fitness check (Phase 5) greps for tool invocations and cross-checks them against the flake.

> **Year-3 to year-10 test**: In 3 years, a new hire clones the repo and runs `nix develop`. They don't install rust, go, or deno manually — the shell has them. This is what makes the template copy-paste viable. Containerization would age the same way but with a 100× worse iteration loop. At year 10, Nix flakes are likely still the strongest reproducible-shell story.

### 3.2 Strict Recipe Boundaries — "One Command, One Purpose"

- **Pattern chosen**: Unix-philosophy just recipes. Each recipe does exactly one thing and composes with others.
- **Why**: The current `just server run` comment says "todo: separate 'build' and 'run' commands". Mixing build and run in one recipe means every `run` incurs a rebuild, which kills iteration. Separate recipes let you `just server build` once, then `just server run` repeatedly — each clean, each fast.
- **How it's applied**: Recipes split along a three-axis grid: **action** (build / run / test / check) × **component** (db / engine / grpc) × **composed** (roll-ups like `build` that call all three build-subcommands). The justfile groups match: CI, Build, Dev, Deploy.
- **Standards enforced**:
  - Every "build-X" recipe is idempotent (running twice produces the same state).
  - Every "run-X" recipe assumes build artifacts exist (doesn't rebuild inside run).
  - `run` composes the three component runs via signal trap (from Phase 2).
  - `test` doesn't depend on build — relies on cargo run / go run for engine and rpc, which build incrementally.

### 3.3 Fitness-First Enforcement — "Checks Over Conventions"

- **Pattern chosen**: Architecture fitness functions as executable shell scripts, aggregated under `just server fitness`.
- **Why**: The template genre dies when conventions are "documented but not enforced." Every rule in `server.md` ("hexagonal Rust", "no cross-layer imports") is worth zero without an automated check. Fitness functions make architecture a first-class, testable artifact.
- **How it's applied**: Each rule is a one-liner or short shell snippet inside `server.just`. They all execute sequentially under the `fitness` recipe, each printing ✅ or ❌ + a reason. Total runtime is budgeted at < 5 seconds so fitness can be part of the local dev pre-commit loop.
- **Standards enforced**:
  - Every architectural rule in any doc has a matching fitness check or the rule is deleted.
  - Every fitness check is self-describing: the output tells you which rule failed and why.
  - Fitness fails on first real violation but continues running all checks so you see the full diff.

> **Year-3 to year-10 test**: In year 5, a new contributor adds `surrealdb` as a dep to the `domain` crate "just for a quick thing." Without fitness, this is merged. With fitness, CI-less-though-we-are, `just server fitness` before push fails loudly. The hexagonal architecture is preserved by the check, not by memory.

### 3.4 Zero-Boilerplate Template — "Nothing to Delete"

- **Pattern chosen**: Aggressive minimalism. Anything that isn't actually in use gets deleted, not commented out.
- **Why**: Templates rot by accumulating dead code and stub files. A new user cloning the template is stuck reading commented-out blocks trying to understand "is this for me?" Dead comments lie. Delete them instead.
- **How it's applied**: No `#todo:` blocks in `server.just` (they turn into real code or get deleted). No empty `*.sh` files "reserved for future use". No Dockerfiles for services that aren't containerized. No `scripts/` directory if it only contains scripts that don't run.
- **Standards enforced**: A fitness check flags `#todo` and `# TODO` in `server.just`. Another check fails if any `.sh` file exists outside `db/scripts/`. Another fails if more than one `Dockerfile` exists in the repo.

---

## 4. Component Map & Directory Structure

### Target tree (after Phases 4–6; removals marked `-`, additions `+`, revisions `~`)

```
src/server/
├── flake.nix                          ~ add cargo, go, deno, buf, jq
├── server.just                        ~ add build-grpc; finalize run; add fitness, down, status, doctor
├── .env.example                       + canonical env reference
├── README.md                          ~ microkernel quickstart + feature matrix
├── TEMPLATE.md                        + cleanup checklist for people cloning
│
├── db/                                (unchanged — keep as-is)
│   ├── db.Dockerfile                  (THE ONLY DOCKERFILE)
│   ├── docker-compose.yml
│   ├── init/
│   │   └── 01-schema ... 05-seed
│   └── scripts/                       (THE ONLY .sh FILES)
│       ├── entrypoint.sh
│       └── init-db.sh
│
├── engine/                            (Rust workspace — native in Nix shell)
│   └── (unchanged from Phase 1)
│
├── rpc/                               (Go module — native in Nix shell)
│   └── (unchanged from Phase 1)
│
├── proto/                             (buf config + .proto files)
│   └── (unchanged)
│
└── tests/
    ├── preflight.ts                   (from Phase 3)
    ├── deno.json                      ~ test task runs preflight first
    ├── lib/
    │   ├── health.ts                  (from Phase 3)
    │   ├── errors.ts                  (from Phase 3)
    │   ├── assert.ts
    │   ├── client.ts
    │   └── fixtures.ts
    ├── fixtures/
    │   ├── surreal_env.ts
    │   ├── api_env.ts
    │   └── rpc_env.ts
    ├── unit/db/
    │   ├── indexes.test.ts
    │   └── schema.test.ts
    ├── integration/
    │   ├── api/
    │   ├── db/
    │   └── rpc/
    ├── e2e/
    │   └── smoke.test.ts
    │
    ├─ fixtures.sh                     - DELETE
    ├─ run-all.sh                      - DELETE
    ├─ unit/01-schema.sh               - DELETE
    └─ e2e/01-smoke.sh                 - DELETE

scripts/                               - DELETE (entire dir if it exists)
└── run-stack.sh                       - DELETE
```

### Component Responsibilities (revised)

**`flake.nix`**
- Exposes: one `devShells.default` named `gwa-server` with full toolchain.
- Consumes: nixpkgs unstable.
- Must not: assume anything about the host system beyond Nix itself.

**`server.just`**
- Exposes: `fmt`, `lint`, `typecheck`, `quality`, `build-db`, `build-engine`, `build-grpc`, `build`, `run`, `test`, `down`, `status`, `fitness`, `doctor`, `deploy` (commented-out sketch).
- Consumes: tools from the Nix shell.
- Must not: contain any orchestration that isn't expressible as a single recipe body; call external `.sh` scripts (except DB container's own internal scripts).

**`db/` (unchanged)**
- Exposes: SurrealDB HTTP + WebSocket on :8000.
- Consumes: volume for persistence.
- Must not: be touched by this phase — it works.

**`engine/` (native process)**
- Exposes: GraphQL at :3000.
- Consumes: DB at :8000, RPC at :4000 (grpc client).
- Must not: have a Dockerfile.

**`rpc/` (native process)**
- Exposes: gRPC at :4000.
- Consumes: nothing mandatory (notifier uses SMTP optionally).
- Must not: have a Dockerfile.

**`tests/preflight.ts`**
- Exposes: CLI, exit 0 if all three services reachable, 1 otherwise, with readable banner.
- Consumes: `lib/health.ts`.
- Must not: run any tests. Must not: start any services.

---

## 5. Trade-off Analysis

```
DECISION: Containerize engine/rpc or run native in Nix shell?
OPTIONS CONSIDERED:
  A. Native in nix develop (engine: cargo run; rpc: go run)
     pros: sub-second iteration; debugger works; no image churn; matches template ethos
     cons: relies on Nix for env consistency (acceptable — flake pins versions)
  B. Containerize everything
     pros: perfect reproducibility; matches production shape
     cons: 5-minute rebuild per Rust change; kills iteration; user explicitly rejected this
  C. Hybrid: native by default, containers via opt-in recipe
     pros: flexibility
     cons: two paths to maintain; fitness rules become ambiguous; template user has to choose
CHOSEN: A — native in Nix shell for engine and rpc
REASON: The user's mental model is microkernel: only stateful things get containers. This is
        a philosophy choice that ages well — debuggability and iteration speed dominate at
        template-scale, and Nix provides the reproducibility ceiling we need.
REVISIT IF: The template is ever used as a starting point for a cloud-native service that
            needs identical prod and dev images. At that point, fork this decision for that
            downstream project — don't muddy the template.
```

```
DECISION: Delete stray .sh test scripts or keep as alternatives?
OPTIONS CONSIDERED:
  A. Delete all .sh files outside db/scripts/
     pros: single source of truth for tests; no drift between sh and ts versions
     cons: loses the "shell-based smoke test" pattern that some teams like
  B. Keep shell tests as redundant coverage
     pros: "defense in depth"
     cons: drift guaranteed over time; template user has to understand two systems; bloat
  C. Delete but document the historical pattern in a commit message
     pros: git history preserves context; present state is clean
     cons: requires discipline in commit message
CHOSEN: A — delete outright (C tactic for the commit message)
REASON: Template cleanliness is core to this plan. The Deno suite has already ported every
        shell test to .test.ts. Keeping both is drift waiting to happen and boilerplate the
        template user doesn't need.
REVISIT IF: Never — this decision is definitional for the template's aesthetic.
```

```
DECISION: What does `build-grpc` actually build?
OPTIONS CONSIDERED:
  A. Only Go codegen (buf generate into rpc/gen/)
     pros: matches the naming ("grpc" → the RPC sidecar)
     cons: doesn't cover TS test stubs if those ever get generated
  B. Go codegen + Go binary compile
     pros: one recipe, full artifact
     cons: naming is slightly off (build-grpc implies codegen, not binary)
  C. Go codegen + TS codegen (both consumers of proto)
     pros: single source of truth invocation
     cons: Rust side generates via build.rs on cargo build, so parity is already 2-of-3
CHOSEN: A — `build-grpc` runs buf generate for Go; the Go binary builds on `cargo`-equivalent
         (i.e., `go build` happens inside `run` via `go run`, or as a separate `build-rpc`
         recipe if a pre-built binary is ever needed)
REASON: Recipe names should match intent. `build-grpc` is understood as "regenerate proto-
        derived code for the gRPC sidecar." Binary compilation isn't coupled to proto gen
        and is handled by `go run` at startup.
REVISIT IF: The template evolves to need a pre-built rpc binary (rare — would only happen if
            cold-start matters, which it doesn't at template scale).
```

```
DECISION: Preflight enhancement — just reachability, or also seed data?
OPTIONS CONSIDERED:
  A. Reachability only (current state)
     pros: fast; stable across DB resets
     cons: test can false-pass on an empty DB (but e2e smoke test catches that later)
  B. Reachability + seed-count probe (e.g., "at least one user exists")
     pros: earlier signal
     cons: preflight becomes stateful; has to know schema; coupled to seed data
  C. Reachability + namespace/database existence check
     pros: catches "DB up but unconfigured" state
     cons: marginal extra value — init-db.sh already provisions ns/db at container start
CHOSEN: A — reachability only
REASON: Preflight's job is "can the test suite connect to services." Seed data validation is
        the smoke test's job. Preflight must stay fast and domain-agnostic so the template
        user can swap schemas without breaking it.
REVISIT IF: Preflight gets called in contexts where it's the only gate (e.g., before a
            manual demo), where failing-silent on no-seeds would be embarrassing.
```

```
DECISION: Where does signal-trap orchestration live — inline in `run` recipe or in a script?
OPTIONS CONSIDERED:
  A. Inline in server.just (multi-line recipe body with trap)
     pros: single source of truth; no stray scripts; matches microkernel aesthetic
     cons: just recipes aren't the most ergonomic place for 20+ lines of bash
  B. In scripts/run-stack.sh called from recipe
     pros: easier to edit/read as a standalone shell file
     cons: violates "no .sh outside db/scripts/" rule; template user has two files to read
CHOSEN: A — inline in the recipe
REASON: The microkernel rule is strict and earns its keep by being strict. A 20-line just
        recipe is acceptable; two mysterious files are not.
REVISIT IF: The recipe grows past 40 lines or starts to need arrays/functions shell can't
            express cleanly — at which point, split into small subrecipes, not into a .sh.
```

---

## 6. Phased Implementation Plan (revised)

### Phase 1 — Schema Reality Check ✅ COMPLETE

Delivered: CASCADE fix via `references<session>`, role enum alignment, User field completeness, store test update. All 13 DB tests now green.

### Phase 2 — Process Orchestration ✅ COMPLETE

Delivered: `just server run` starts DB + engine + RPC via shell trap supervisor; `just server down` cleans up; `just server status` reports health.

### Phase 3 — Test Suite Hardening ✅ COMPLETE

Delivered: `preflight.ts` with clear pass/fail reporting; fixture health probes; `StackUnavailableError` readable output. Confirmed by the output shared by the user — preflight correctly shows 🗄️ UP / 🦀 DOWN / 🐹 DOWN and points at `just server run`.

---

### Phase 4 — Microkernel Finalization ✅ COMPLETE

- **Goal**: Commit fully to microkernel-via-Nix. `nix develop` is the shell. Only the DB is containerized. All stray shell scripts are gone. The justfile reads like a clean template.
- **Components to build**:
  1. **Finalize `flake.nix`**. Done.
  2. **Finalize `server.just` `run` recipe**. Done.
  3. **Add `build-grpc` recipe**. Done.
  4. **Update `build` recipe**. Done.
  5. **Remove legacy shell scripts**. Done.
  6. **Remove Dockerfile stubs**. Done.
  7. **Add `.env.example`**. Done.
  8. **Finalize `down` recipe**. Done.

- **Dependencies**: Phases 1–3.
- **Exit criteria**:
  - `nix develop` → shell banner with versions → `cargo --version && go version && deno --version && buf --version` all succeed.
  - `just server run` → within 15s, preflight run elsewhere shows 🗄️ ✅ 🦀 ✅ 🐹 ✅.
  - `Ctrl-C` in the `run` terminal → all three services gone (pgrep returns empty).
  - `just server test` → preflight green, full suite green, summary accurate.
  - `find src/server -name "*.sh" -not -path "*/db/scripts/*"` returns empty.
  - `find . -iname "Dockerfile*" -not -path "*/db/*"` returns empty.
  - `find src/server/scripts -type f 2>/dev/null | wc -l` returns 0 (directory gone).
- **Risk flags**:
  - [MEDIUM RISK] Rust toolchain in Nix: adding `cargo` via plain nixpkgs gives you whatever version nixpkgs pins, which may drift from the project's `rust-toolchain.toml`. Use `rust-bin` overlay or `fenix` for pinning.
  - [LOW RISK] Signal trap on macOS vs Linux: bash's `trap` semantics are identical; the risk is `kill 0` vs explicit PID — use explicit PIDs.
  - [LOW RISK] Podman machine on macOS: first-run latency may exceed 30s. Add a detection note to `doctor`.

---

### Phase 5 — Architecture Fitness (strict, exhaustive) [REPLACES CI]

- **Goal**: Every architectural rule in every doc is enforceable by `just server fitness` in under 5 seconds. The template carries its own architectural conscience.
- **Components to build**: Implement each fitness category as a subrecipe (`fitness-hexagonal`, `fitness-tests`, etc.), compose them under `fitness`.

  **Category 1 — Hexagonal Rust purity**
  - `engine/core/domain/Cargo.toml` must NOT contain: `surrealdb`, `axum`, `tonic`, `async-graphql`, `jsonwebtoken`, `hyper`, `reqwest`, `async-graphql-axum`.
  - `engine/application/Cargo.toml` must NOT contain: `axum`, `tonic`, `async-graphql`, `async-graphql-axum`.
  - `engine/core/store/Cargo.toml` may contain `surrealdb` but NOT `axum`, `tonic`, `async-graphql`.
  - `engine/services/gateway/Cargo.toml` is the ONLY crate allowed to depend on transport crates.
  - Implementation: one grep per rule, aggregate pass/fail.

  **Category 2 — Test isolation**
  - Zero `fetch(` occurrences in `tests/**/*.test.ts` (enforces use of `lib/client.ts`).
  - Zero `Bearer ` string literals in `tests/**/*.test.ts` (enforces use of `getToken`).
  - Zero `localhost` hardcodes in `tests/**/*.test.ts` (enforces env-driven URLs via fixtures).
  - Every `*.test.ts` must import from `../../fixtures/` or `../fixtures/` (no direct client construction).

  **Category 3 — Microkernel enforcement**
  - Exactly one `Dockerfile*` in the repo, and it is `db/db.Dockerfile`.
  - Zero `.sh` files outside `db/scripts/`.
  - No `docker run` or `podman run` invocations in `server.just` (use podman-compose instead for consistency).
  - No `scripts/` directory at `src/server/` level.

  **Category 4 — Proto contract**
  - `cd proto && buf lint` passes.
  - `cd proto && buf breaking --against '.git#branch=main'` passes (skip if on main — detect via `git branch --show-current`).

  **Category 5 — DB pipeline integrity**
  - Every `.surql` file under `db/init/` lives in a subdirectory matching `0[1-9]-*` and names itself matching `0[1-9]-*.surql`.
  - Directory numbering is contiguous starting at 01 (no gaps).

  **Category 6 — Template cleanliness**
  - Zero `TODO`, `todo:`, `FIXME`, `XXX` in `server.just`.
  - Zero domain-specific names in template seeds: grep `db/init/05-seed/*.surql` for `Xibalbá`, `tourism`, `tourist`, `mezcaleria`, etc. Fail if any appear — those belong in the Xibalbá containers, not the template.
  - Zero commented-out blocks over 5 lines in `server.just` (kill dead code).

  **Category 7 — Nix reproducibility**
  - Every tool invoked in `server.just` (greppable as recipe body commands) must appear in the `packages` list of `flake.nix`. One-to-one cross-check.
  - `flake.lock` exists and is not excluded by `.gitignore`.

  **Category 8 — Config consistency**
  - Port numbers used in `server.just` match those in `.env.example`.
  - Env vars read by `engine/services/gateway/src/infra/config.rs` (greppable `env::var(...)`) are all listed in `.env.example`.
  - Env vars read by `rpc/internal/config/config.go` are all listed in `.env.example`.

  **Category 9 — File hygiene**
  - `.gitignore` must cover: `target/`, `node_modules/`, `.env`, `*.log`, `dist/`, `build/`, `.DS_Store`, `rpc/gen/` (codegen artifacts).
  - No files matching `.gitignore` patterns are committed (use `git check-ignore`).

  **Category 10 — Recipe coverage**
  - Every service probed by `preflight.ts` has a corresponding startup in `just server run` (grep cross-check).
  - `just server down` tears down every service `just server run` starts.

- **Delivery**: `just server fitness` outputs something like:
  ```
  🦀 Hexagonal purity
    ✅ domain has no transport deps
    ✅ application has no transport deps
    ✅ store only depends on surrealdb + domain
  🧪 Test isolation
    ✅ no raw fetch in tests
    ✅ no auth literals in tests
    ✅ no localhost hardcodes
  🔒 Microkernel enforcement
    ✅ only db/db.Dockerfile exists
    ✅ no .sh outside db/scripts/
  📦 Proto contract
    ✅ buf lint passed
    ✅ no breaking changes
  🗄️  DB pipeline
    ✅ all .surql files correctly numbered
  ✨ Template cleanliness
    ✅ no TODO in server.just
    ✅ no domain-specific names in template seeds
  ❄️  Nix reproducibility
    ✅ every tool invoked is in flake.nix
  ⚙️  Config consistency
    ✅ ports match across all config sources
  📁 File hygiene
    ✅ .gitignore complete
    ✅ no ignored files committed
  🔗 Recipe coverage
    ✅ all probed services have startup/teardown

  10/10 fitness checks passed in 3.2s
  ```

- **Dependencies**: Phase 4 (need the final tree shape to write the checks against).
- **Exit criteria**:
  - `just server fitness` prints the above (all-green) in under 5 seconds.
  - Deliberately introducing a violation (e.g., `sed -i '1i surrealdb = "*"' engine/core/domain/Cargo.toml`) causes the correct check to fail with a clear reason.
  - Reverting the violation returns to all-green.
- **Risk flags**:
  - [LOW RISK] Some checks may hit edge cases (e.g., `surrealdb` substring-matching a benign package name). Use anchored regex or parse TOML properly for Cargo.toml checks (via `dasel` or `tomlq` if fancy).
  - [LOW RISK] `buf breaking --against` requires a git ref that exists. On a fresh clone before first push, this may fail. Handle by skipping if ref doesn't resolve.

---

### Phase 6 — Template Polish

- **Goal**: A stranger can clone the repo, read one file, and know what they need to delete/rename for their own project.
- **Components to build**:

  1. **Rewrite `README.md`** with four sections:
     - *Quickstart*: `nix develop` → `just server run` → `just server test` (three lines).
     - *Architecture*: the microkernel diagram from §2.
     - *Feature matrix*: what each DB feature demonstrates, which GraphQL endpoints exist, which gRPC methods exist.
     - *Troubleshooting*: three common issues (port conflict, podman machine not started on macOS, stale DB volume after schema change).

  2. **Create `TEMPLATE.md`** — the cleanup checklist for forking the template:
     - Rename `template` to your project name in: `flake.nix` (`description`), `proto/buf.yaml`, `proto/template/v1/` directory, `rpc/go.mod` module path, engine's `Cargo.toml` workspace name.
     - Replace seed data in `db/init/05-seed/` with your domain.
     - Adjust the schema in `db/init/01-schema/` and `02-fields.surql`.
     - Adjust GraphQL types in `engine/services/gateway/src/adapters/graphql/types/`.
     - Adjust proto definitions in `proto/template/v1/`.
     - Run `just server fitness` after each change.

  3. **Add `just server doctor`** — diagnoses common issues and prints fix commands:
     - Is `nix develop` active? (check for Nix env markers)
     - Is podman running? (try `podman ps`)
     - Is podman machine started on macOS? (`podman machine list` for Darwin only)
     - Are ports 8000/3000/4000 free? (try `lsof -i :3000` etc.)
     - Is `.env` present or falling back to `.env.example`?
     Output ends with either "all checks passed" or a numbered list of fixes.

  4. **Add `just server pre-commit`** — runs `fmt lint typecheck fitness` in sequence. Can be wired into a git hook optionally.

  5. **Remove the `deploy` recipe's commented-out body** OR actually implement it minimally. Don't leave a commented stub — the template-cleanliness fitness rule will flag it. Recommendation: leave the recipe signature + a single-line `@echo "Deploy not configured for template"` message; template user fills this in.

- **Dependencies**: Phases 4 and 5.
- **Exit criteria**:
  - A dev unfamiliar with the repo reads only `README.md` and reaches green tests in under 5 minutes.
  - `just server doctor` on a broken setup (e.g., podman not started) prints the exact command to fix it.
  - `just server pre-commit` catches any violation before commit.
  - `just server fitness` post-cleanup still 10/10 green (including no-TODO rule).
- **Risk flags**: None.

---

## 7. Implementation Management

### Sequencing (revised)

```
Phase 1 ✅ → Phase 2 ✅ → Phase 3 ✅
                              ↓
                           Phase 4 (microkernel finalization)
                              ↓
                           Phase 5 (fitness suite)
                              ↓
                           Phase 6 (polish)
```

Phases 4 and 5 cannot parallelize — fitness checks the state that Phase 4 produces. Phase 6 is final.

### Critical Path (for remaining work)

```
flake.nix toolchain additions →
finalized `run` recipe with trap →
delete .sh files + stray Dockerfiles →
write fitness categories 1-10 →
doctor + TEMPLATE.md
```

The first domino is `flake.nix`. If Nix doesn't give you all tools, nothing downstream runs.

### Ownership (solo dev, informational)

All phases owned by the solo developer. Ordering within phases:
- Phase 4: start with flake.nix (bedrock), then recipe surgery (build-grpc, run), then deletions (.sh, scripts, Dockerfile stubs).
- Phase 5: write all 10 categories, then test each by deliberately violating it.
- Phase 6: README first (most-read), TEMPLATE.md second, doctor third.

### Integration Points

1. **`flake.nix` ↔ `server.just`**: Every tool used in a recipe must be in the flake. Enforced by fitness Category 7.
2. **`preflight.ts` ↔ `just server run`**: Every service probed by preflight must be started by `run`. Enforced by fitness Category 10.
3. **`.env.example` ↔ `infra/config.rs` ↔ `config.go`**: Three places where env vars must agree. Enforced by fitness Category 8.
4. **Proto files ↔ engine `build.rs` ↔ `rpc/gen/`**: Change a `.proto` → run `just server build-grpc` → Rust side regenerates on next `cargo build`.

### Breaking Changes

- [HIGH RISK] **Deleting `scripts/run-stack.sh`** (Phase 4): if any dev has muscle-memory for calling it directly, they break. Mitigation: commit message calls it out, README update documents `just server run` as the only path.
- [MEDIUM RISK] **Toolchain version lock in flake.nix**: pinning Rust via rust-bin can break if the pinned version has a compiler bug. Prefer pinning to a known-stable release, not bleeding edge.
- [LOW RISK] **`build-grpc` regenerates files into `rpc/gen/`**: if anyone was hand-editing generated files, those edits are lost. Mitigation: gitignore `rpc/gen/` and enforce via fitness Category 9.

---

## 8. Validation & Testing Strategy

### Test Matrix (revised)

| Layer | Test Type | What it verifies | How to run |
|---|---|---|---|
| Shell env | Smoke | nix develop provides full toolchain | `just server doctor` |
| DB schema | Unit (Deno) | ASSERTs + unique indexes | `just server test` |
| DB events + functions + graph | Integration (Deno) | Side effects, traversals, fn:: | `just server test` |
| Rust store | Integration (cargo) | Store repos against live DB | `cd engine && cargo test -p store` |
| GraphQL | Integration (Deno) | Resolver contract + auth | `just server test` |
| gRPC | Integration (Deno) | Service method contracts | `just server test` |
| E2E | E2E (Deno) | Multi-service flow | `just server test` |
| Architecture | Fitness (shell) | All 10 categories | `just server fitness` |
| Preflight | Health (Deno) | Service reachability | `cd tests && deno run -A preflight.ts` |

### Architecture Fitness Functions (the full Phase 5 list is the fitness strategy)

See Phase 5 Categories 1–10. Each runs under 500ms; total suite under 5s.

### Local Dev Validation (the dev's loop)

1. `nix develop` (first time) / `direnv allow` if using direnv → shell loaded with toolchain.
2. `just server run` (terminal 1) → all three services up within 15s.
3. `just server test` (terminal 2) → preflight green, tests green.
4. Edit a `.surql` file → `just server down && podman-compose down -v && just server run` to pick up schema changes.
5. Edit Rust code → Ctrl-C in terminal 1, `just server run` again (fast rebuild).
6. Before commit → `just server pre-commit` → fmt + lint + typecheck + fitness.

### Observability (unchanged from v1.0)

- DB: podman logs + SurrealDB's `SURREAL_LOG`.
- Engine: `tracing` + `TraceLayer::new_for_http()`.
- RPC: `slog` with PrettyHandler.
- Suite: emoji group prefixes + accurate printSummary.

---

## 9. Open Questions & Risks

### Open Questions

1. **Rust toolchain pinning strategy**: `rust-bin` overlay vs `fenix` vs plain nixpkgs `cargo`. `rust-bin` is most popular and gives `rust-toolchain.toml` support. Recommendation: `rust-bin` via `nixpkgs-mozilla` or `oxalica/rust-overlay`. Confirm during Phase 4.
2. **Buf protoc plugins in Nix**: `buf generate` pulls plugins from remote (buf.build/protocolbuffers/go). Network-required. Acceptable? Yes at template scale; flag if offline dev is ever needed.
3. **macOS Rosetta quirks**: If the target dev is on Apple Silicon, some Nix packages may require specific system platform handling. Test `nix develop` on both x86_64-linux and aarch64-darwin before declaring Phase 4 done.
4. **TypeScript test stubs from proto**: `tests/buf.gen.yaml` exists but the test client uses untyped JSON — is TS codegen wanted? Recommendation: no; test client stays untyped for simplicity; delete `tests/buf.gen.yaml` if unused (fitness Category 6 will complain about it if not).

### Risks

1. **[HIGH RISK] Nix flake reproducibility on first developer onboarding**: Someone cloning the repo on a fresh machine without Nix installed needs to install Nix first. That's out of scope of this template but worth a README note. Mitigation: README quickstart says "install Nix first" with a link.
2. **[MEDIUM RISK] Fitness suite false positives**: A naive grep for `surrealdb` in Cargo.toml could match the `surrealdb-types` crate incorrectly. Use precise TOML parsing (`dasel`, `tomlq`) for Category 1 instead of raw grep. Flag each category's implementation as "grep-OK" or "needs parser."
3. **[MEDIUM RISK] Podman on macOS first-run latency**: `podman machine start` can take 60+ seconds. If `just server run` starts with a 30s timeout on DB health, first-run on macOS may fail. Mitigation: add a 60s timeout for macOS in the recipe, or auto-run `podman machine start` if not running (and document that `just server doctor` will detect this).
4. **[LOW RISK] `buf generate` network dependency**: Remote plugins can fail on flaky networks. Mitigation: cache results via `buf`'s own cache, or (for airgapped scenarios) use local plugins.
5. **[LOW RISK] Trap signal handling edge cases**: If the engine crashes but rpc keeps running, the trap may not fire cleanly. Mitigation: `just server status` will show the orphan; `just server down` kills all by pgrep-name.

---

## Appendix A — The New `server.just` Shape (structural only, no code)

```
Groups (unchanged):
  CI    : fmt, lint, typecheck, quality
  Build : build-db, build-engine, build-grpc  [NEW], build
  Dev   : run [finalized], test, down [new], status [new], fitness [new], doctor [new], pre-commit [new]
  Deploy: deploy (sketch stays but body trimmed to single echo)

Recipe dependency graph:
  build ← build-db + build-engine + build-grpc
  run   ← build (optional flag to skip for iteration)
  test  ← (no build dep; deno task test handles preflight + suite)
  quality ← fmt + lint + typecheck
  pre-commit ← fmt + lint + typecheck + fitness
```

---

## Appendix B — The Fast-Path Checklist (TL;DR for the impatient)

For Phase 4–6 in one sequence:

1. Extend `flake.nix` packages with cargo, go, deno, buf, jq.
2. Rewrite `just server run` to start all three services inline with signal trap.
3. Add `just server build-grpc` (runs `cd proto && buf generate`).
4. Delete `tests/*.sh`, `tests/unit/01-schema.sh`, `tests/e2e/01-smoke.sh`, and `scripts/run-stack.sh`.
5. Verify exactly one Dockerfile remains (`db/db.Dockerfile`).
6. Implement `just server fitness` with all 10 categories.
7. Write `README.md` quickstart and `TEMPLATE.md` cleanup checklist.
8. Add `just server doctor` and `just server pre-commit`.
9. Run `just server fitness` → 10/10 green.
10. Ship.