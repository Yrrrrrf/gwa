# Template Server — Integration & Wiring Plan

**Spec Version**: 1.0
**Date**: 2026-04-18
**Status**: Ready for execution
**Reference**: `src/server/` — working server stack from `server.md`, tested by `server-test.md`. This plan closes the wiring gap between them.

---

## 0. Executive Summary

The template server is 80% built but 0% wired. The DB layer is solid (12/12 DB tests pass except one real schema bug), the Rust engine compiles, the Go sidecar compiles, and the Deno test suite is architecturally correct. What's missing is **orchestration**: `just server run` only starts the DB container, leaving the Rust engine (port 3000) and Go sidecar (port 4000) unstarted, so every API and RPC test fails with `Connection refused`. This plan delivers the missing integration layer: a three-service orchestrator behind a single command, a test suite that fails fast with helpful errors when services are down, a dedicated schema fix for the CASCADE DELETE bug, containerization for CI parity, and a GitHub Actions workflow that runs the whole thing. When this plan is done, `just server run` brings the stack up; `just server test` proves it works; CI runs the same commands and catches regressions. The template becomes genuinely copy-pasteable — clone, `nix develop`, `just server run` in one terminal, `just server test` in another, green in under two minutes.

---

## 1. Context & Constraints

### Current State (from the test run)

**What works:**
- SurrealDB 3 container boots, seeds, and serves via `podman-compose`.
- 12 DB tests pass (schema asserts, unique indexes, custom functions `fn::search_items`/`fn::popular_items`/`fn::items_near`, graph traversals, audit events, computed stats, E2E smoke, full-text search).
- The Deno fixture pattern (`withSurrealEnv`, `withApiEnv`, `withRpcEnv`) works cleanly.
- The SurrealDB HTTP error detection (`status: "ERR"` in JSON despite HTTP 200) is correct.
- Compilation: Rust workspace and Go module both build.

**What's broken:**
1. **`just server run` only starts the DB.** The line `cd engine && cargo run -p api` is commented out, and the Go sidecar has no entry in the command at all. Every API test (4) and RPC test (3) fails with `Connection refused` on :3000 and :4000.
2. **CASCADE DELETE doesn't cascade.** Test `G1` deletes a user but the session remains. The `DEFINE FIELD user ON session TYPE record<user> REFERENCE ON DELETE CASCADE` clause alone is insufficient in SurrealDB 3 — the parent table needs a back-reference via `references<session>` for the cascade engine to track it.
3. **Role enum mismatch.** DB asserts `role IN ['admin', 'owner', 'user']` but Rust domain defines `Role::{Tourist, Owner, Admin}` which serializes to `"tourist"` — will silently break any user create that trusts the Rust serialization.
4. **User schema gaps.** Rust `User` entity has `display_name`, `avatar_url`, `locale`, `country_code` — the template's `02-fields.surql` does not define these. SCHEMAFULL will reject any Rust-side create.
5. **Test summary lies on failure.** When a fixture can't connect, steps throw before `printSummary()` runs, producing misleading `Results: 0/0 passed | 0 failed` lines — looks like "nothing ran" instead of "nothing could run."

### Goals — What "Done" Looks Like

1. `just server run` starts the full stack (DB + engine + RPC) with one command and one Ctrl-C takes everything down cleanly.
2. `just server test` runs the full suite and reports accurate pass/fail counts. When services are down, it says so clearly and points at `just server run`.
3. All 24+ tests pass against a healthy stack (12 DB + 4 API + 3 RPC + 2 E2E + 3 security once added).
4. A CI workflow runs the same `just` commands inside containers and produces a green check on PR.
5. Every layer has a fitness function preventing architectural regression.
6. A new developer can clone → `nix develop` → `just server run` (terminal 1) → `just server test` (terminal 2) → green in under 2 minutes.

### Team & Scale

- Solo developer. [ASSUMPTION]
- Template-scale: local dev only, tens of records, no clustering, no load testing.
- CI runs on GitHub Actions free tier. [ASSUMPTION]

### Architectural Rules

- **No new frameworks.** Use what's already in the stack: Nix + just + podman + deno + cargo + go.
- **Container-first for DB.** SurrealDB must never be installed natively — the user explicitly relies on the podman container. Engine and RPC can run natively in dev but must also have Dockerfiles for CI.
- **Single entry command.** `just server run` is the canonical bring-up. No README that tells users to open three terminals.
- **Graceful shutdown.** Ctrl-C in `just server run` must tear down all three services cleanly. No orphaned `cargo run` processes.
- **Test suite is stack-agnostic.** The tests themselves don't know or care whether services run natively or in containers — they hit HTTP/RPC endpoints.
- **CI is not a special snowflake.** CI runs the same `just` commands as local. No `.github/workflows/*.yml` with bespoke logic that doesn't exist in `justfile`.

### Out of Scope

- Production deployment (Cloud Run, Kubernetes, etc.).
- Observability stack (Prometheus, Grafana, OpenTelemetry collectors) — `tracing` for Rust and `slog` for Go are sufficient at template scale.
- Multi-region, HA, clustering.
- GraphQL subscription load testing.
- Migrating the Go sidecar's PostgREST-style template fetch to SurrealDB (flagged as quirk, separate decision).

### Assumptions

- [ASSUMPTION] SurrealDB 3's `REFERENCE ON DELETE CASCADE` requires a matching `references<T>` field on the parent table. Validated by the test failure: session persists after user delete, which is exactly the symptom of a missing back-reference.
- [ASSUMPTION] The Go sidecar speaks raw gRPC (via `grpc.NewServer()`), not Connect protocol. The current test client uses untyped JSON-over-HTTP which works with Connect-style routing but not raw gRPC. This needs a spike before Phase 3 — if it's raw gRPC, the test client becomes `nice-grpc` or similar.
- [ASSUMPTION] `deno`, `go`, and `cargo` are all on PATH inside `nix develop`. The current `flake.nix` lists `just podman podman-compose curl xh protobuf` but not these three. Needs to be added.
- [ASSUMPTION] Process group management via shell (`trap`, `wait`) is sufficient for local dev orchestration. No need for `overmind`/`process-compose`/`foreman`.
- [ASSUMPTION] GitHub Actions' `docker` and `podman` availability is equivalent for container-based CI.

---

## 2. Architecture Overview

### The Integration Layers

```
  ┌─────────────────────────────────────────────────────────┐
  │                    just server                          │
  │  (orchestration — this plan delivers this layer)        │
  │                                                         │
  │   run   │   test   │   down   │   logs   │   status     │
  └────┬────┴────┬─────┴────┬─────┴────┬─────┴───────┬──────┘
       │        │           │          │              │
       ▼        ▼           ▼          ▼              ▼
  ┌──────────────────────────────────────────────────────────┐
  │                  Stack Processes                         │
  │                                                          │
  │   SurrealDB :8000   Rust Engine :3000   Go RPC :4000    │
  │   (container)       (native dev /        (native dev /   │
  │                      container CI)        container CI)  │
  └──────────────────────────────────────────────────────────┘
                              ▲
                              │ HTTP/WS/gRPC (black-box)
                              │
  ┌───────────────────────────┴──────────────────────────────┐
  │              Deno Test Suite (consumer)                  │
  │       unit/  │  integration/  │  e2e/  │  security/      │
  └──────────────────────────────────────────────────────────┘
```

### What This Plan Owns vs. What Already Exists

| Concern | Status | Phase |
|---|---|---|
| DB schema, events, functions | ✅ Exists, 1 bug | Phase 1 |
| Role/User alignment | ❌ Mismatch | Phase 1 |
| Rust engine code | ✅ Exists | — |
| Go sidecar code | ✅ Exists | — |
| Test suite code | ✅ Exists | Phase 3 hardens it |
| `just server run` full stack | ❌ Missing | Phase 2 |
| `just server down` / `logs` / `status` | ❌ Missing | Phase 2 |
| Health checks + pre-flight | ❌ Missing | Phase 3 |
| Dockerfiles for engine + RPC | ❌ Missing | Phase 4 |
| Full-stack docker-compose | ⚠️ DB only | Phase 4 |
| GitHub Actions | ❌ Missing | Phase 5 |
| Architecture fitness | ❌ Missing | Phase 6 |
| README quickstart | ⚠️ Partial | Phase 6 |

### Core Domain vs. Supporting

- **Core deliverable of this plan**: the `server.just` file and its companions (Procfile-equivalent or shell orchestration). This is the glue that makes three services behave as one.
- **Supporting deliverables**: health probes, test pre-flight, Dockerfiles, CI workflow, architecture fitness checks, docs.

---

## 3. Design Patterns & Code Standards

### 3.1 Process Orchestration — "Shell-Native Supervisor"

- **Pattern chosen**: Shell-based process group supervisor with `trap`-driven teardown.
- **Why**: The alternatives all fail for a template's constraints. `overmind` and `process-compose` add a binary dependency that Nix users must install. Docker Compose for engine and RPC works but forces every dev to go through image rebuild on every code change, which destroys the iteration loop. A just recipe that backgrounds three processes, stores their PIDs, and uses `trap 'kill 0' INT TERM EXIT` is ~15 lines of shell and has zero extra deps. It also composes with Nix flakes cleanly.
- **How it's applied**: A `just server run` recipe starts podman-compose in detached mode, waits for the DB health check, then foregrounds `cargo run -p gateway` and backgrounds `go run ./rpc/cmd/server`. A signal trap tears everything down on Ctrl-C. PIDs are captured to a temp file so `just server down` can also clean up.
- **Standards enforced**: No service gets started without a prior health check of its dependencies (engine waits for DB, RPC waits for nothing since it's independent). Every recipe that starts a process must pair with a teardown recipe. All service ports are defined in one place (env vars in `.env`) so nothing is hardcoded.

> **Year-3 to year-10 test**: In 3 years, a new dev will either add a 4th service (worker?) or swap one out. A shell supervisor makes this a 5-line change. A docker-compose-only approach would force them to learn compose overrides. A bespoke Rust orchestrator would be technical debt. The shell pattern ages well because shell itself ages well.

### 3.2 Test Suite Pre-flight — "Fail Fast, Fail Readable"

- **Pattern chosen**: Health probe + explicit error contract at fixture boundary.
- **Why**: Right now, a developer sees `Connection refused (os error 111)` stack traces and has to reverse-engineer that the Rust engine wasn't running. This wastes time for every newcomer. The fix is that each fixture (`withApiEnv`, `withRpcEnv`, `withSurrealEnv`) does a liveness probe before yielding context — if the probe fails, the fixture throws a single clean error: `"Rust engine not reachable at http://localhost:3000. Run 'just server run' first."`
- **How it's applied**: Each fixture does a single cheap HTTP call at setup (GET / or similar introspection). On failure, it throws a typed `StackUnavailableError` with the service name and expected command. The Deno test reporter catches this once per test file and prints a one-liner instead of a stack trace.
- **Standards enforced**: No test file may assume services are up. No fixture may catch the `StackUnavailableError` — it must propagate. Test output at the top always shows "pre-flight: DB ✓ API ✓ RPC ✗" so the failure mode is visible before the first test even runs.

### 3.3 CI Parity — "Same Commands Everywhere"

- **Pattern chosen**: CI invokes `just` recipes. No parallel implementation.
- **Why**: The #1 source of flaky CI is CI workflows that duplicate local commands with slightly different flags. Drift between `justfile` and `.github/workflows/*.yml` is guaranteed over a 2-year period. The fix is that the CI workflow is thin — it installs just + deno + nix, then calls `just server test`. If the local command works, CI works. If CI fails but local passes, the divergence is in `just`, and fixing it there fixes both.
- **How it's applied**: `.github/workflows/server.yml` has three jobs — lint (`just server lint`), test (`just server test`), and typecheck (`just server typecheck`). Each job starts from a clean container and does nothing CI-specific beyond setup.
- **Standards enforced**: Any behavior that must differ between local and CI is expressed as a just variable or recipe argument, not as CI-only YAML logic. Example: `just server test local` vs `just server test ci` where `ci` suppresses colors and forces JSON output.

### 3.4 Containerization — "Engine and RPC in Multi-Stage Images"

- **Pattern chosen**: Multi-stage Docker builds with explicit cache layers.
- **Why**: The Rust engine's compile time is the test suite's biggest CI slowdown. A naive `cargo build` in a Dockerfile takes 5+ minutes per run. Multi-stage with cargo-chef (or `cargo build --dependencies`) drops that to under 60s on cache hits. The Go sidecar is faster but benefits from the same pattern.
- **How it's applied**: `engine/Dockerfile` has a builder stage that caches dependencies separately from source, and a runtime stage based on `debian:bookworm-slim` (matching the DB base image for consistency). `rpc/Dockerfile` follows the same structure. Both produce <100MB runtime images.
- **Standards enforced**: No `:latest` tags ever. Every image is tagged with the git SHA in CI and `dev` locally. `.dockerignore` is strict — no target/, no node_modules, no .git.

### 3.5 Architecture Fitness Functions — "Automated Boundary Enforcement"

- **Pattern chosen**: Lightweight CI-grep checks + Cargo workspace rules.
- **Why**: Rules in `server.md` like "domain depends on nothing" are aspirational without enforcement. A single PR that adds `surrealdb = { workspace = true }` to `domain/Cargo.toml` quietly breaks the hexagonal architecture. Automated checks catch this in CI.
- **How it's applied**: A just recipe `fitness` runs: (1) `grep -L surrealdb domain/Cargo.toml` must succeed (domain must not have surrealdb); (2) `grep -L axum application/Cargo.toml` (application must not have axum); (3) test files grepped for raw `fetch(` (must use `lib/client.ts`); (4) test files grepped for `Authorization` literal (must use token from fixture).
- **Standards enforced**: Every fitness rule is a one-liner shell check. Rules are added to `server.just` as the architecture grows. CI runs `just server fitness` as a required status check.

---

## 4. Component Map & Directory Structure

### Proposed tree (additions marked with `+`, modifications with `~`)

```
src/server/
├── flake.nix                          ~ add deno, go, cargo to packages
├── server.just                        ~ rewrite run/test, add up/down/logs/status/fitness
├── .env.example                       + canonical env var reference
├── Procfile                           + (optional) if shell trap proves insufficient
├── README.md                          ~ quickstart + troubleshooting
│
├── db/                                (unchanged — works)
│   ├── db.Dockerfile
│   ├── docker-compose.yml             ~ add engine + rpc services for full-stack up
│   └── init/
│       └── 01-schema/02-fields.surql  ~ add references<session> to user; fix role enum
│
├── engine/
│   ├── Dockerfile                     + multi-stage build for gateway binary
│   ├── .dockerignore                  +
│   ├── Cargo.toml                     (unchanged)
│   └── core/domain/src/entities/
│       └── user.rs                    ~ align Role enum: Tourist→User OR DB→tourist
│
├── rpc/
│   ├── Dockerfile                     + multi-stage build for rpc binary
│   ├── .dockerignore                  +
│   └── (rest unchanged)
│
├── proto/                             (unchanged)
│
├── tests/
│   ├── deno.json                      ~ add test:preflight task
│   ├── lib/
│   │   ├── health.ts                  + service liveness probes
│   │   └── errors.ts                  + StackUnavailableError type
│   ├── fixtures/
│   │   ├── surreal_env.ts             ~ call health probe; throw on failure
│   │   ├── api_env.ts                 ~ call health probe; throw on failure
│   │   └── rpc_env.ts                 ~ call health probe; throw on failure
│   └── preflight.ts                   + standalone pre-flight script
│
└── scripts/
    ├── run-stack.sh                   + process supervisor script (if just recipe gets ugly)
    └── wait-for.sh                    + generic health wait utility

.github/
└── workflows/
    ├── server-ci.yml                  + lint + test + typecheck
    └── fitness.yml                    + architecture fitness checks
```

### Component Responsibilities

**`server.just` (orchestrator)**
- Exposes: `run`, `down`, `test`, `logs`, `status`, `fitness`, `build`, `lint`, `typecheck`.
- Consumes: podman-compose, cargo, go, deno, the `scripts/` helpers.
- Must not: reimplement what docker-compose does; hardcode ports.

**`scripts/run-stack.sh` (if needed)**
- Exposes: background-starts all three services, writes PIDs, waits for health, traps signals.
- Consumes: `.env` vars, the three service startup commands.
- Must not: know anything about test logic or CI.

**`tests/lib/health.ts` (probes)**
- Exposes: `probeSurreal()`, `probeApi()`, `probeRpc()`, each returning `Promise<boolean>`.
- Consumes: only `fetch`.
- Must not: throw on failure (that's the fixture's job); retry more than once.

**`tests/preflight.ts` (standalone check)**
- Exposes: a CLI that prints a three-line status table.
- Consumes: `lib/health.ts`.
- Must not: run any actual tests.

**`engine/Dockerfile`**
- Exposes: a runtime image that starts `gateway`.
- Consumes: the Cargo workspace.
- Must not: include build tools in the final stage.

**`rpc/Dockerfile`**
- Exposes: a runtime image that starts the Go binary.
- Consumes: the Go module.
- Must not: include the Go toolchain in the final stage.

---

## 5. Trade-off Analysis

```
DECISION: How to orchestrate three services for local dev
OPTIONS CONSIDERED:
  A. Pure shell via just recipe (background + trap)
     pros: zero new deps; works in Nix shell; 15-line recipe
     cons: PID juggling; Windows devs need WSL (but Nix already forces WSL)
  B. overmind / foreman / process-compose
     pros: purpose-built; Procfile is standardized; nice UX (per-process logs)
     cons: new binary dep; must be added to flake.nix; one more thing to learn
  C. Full docker-compose for all three services
     pros: perfect parity with CI; one image rebuild = reproducible
     cons: destroys iteration loop (rebuild on every Rust change); 5-min feedback cycle
  D. Nix-native process-compose via services.nix
     pros: declarative; composable; integrates with flake
     cons: steep learning curve; niche; team doc burden
CHOSEN: A (shell via just recipe) for dev, C (docker-compose) available for CI
REASON: Dev loop iteration speed is the #1 priority for a template. Shell traps are boring,
        proven, and survive any reasonable team transition. Containers for CI give parity
        without sacrificing dev speed.
REVISIT IF: The team grows past 3 devs OR a fourth service is added OR Windows-native
            (non-WSL) support becomes a requirement.
```

```
DECISION: How to fix the CASCADE DELETE issue on session.user
OPTIONS CONSIDERED:
  A. Add references<session> field on user table
     pros: canonical SurrealDB 3 idiom; back-reference enables cascade tracking
     cons: adds a field to user schema (minor)
  B. Switch to manual cleanup (DB event on user delete → delete sessions)
     pros: works regardless of SurrealDB version
     cons: reinvents what REFERENCE is supposed to do; event ordering risks
  C. Drop CASCADE, handle session cleanup in the Rust engine
     pros: explicit; testable in Rust
     cons: defeats the point; every auth impl would need to remember
CHOSEN: A (references<session> on user)
REASON: This is the documented pattern. The test failing is a smoke signal that the schema
        is incomplete, not that SurrealDB is broken.
REVISIT IF: SurrealDB 4 changes the reference semantics.
```

```
DECISION: How to align the role enum mismatch (Rust Tourist vs DB user)
OPTIONS CONSIDERED:
  A. Change Rust: Tourist → User (template-faithful)
     pros: template stays generic; matches the template's DB schema (admin/owner/user)
     cons: template must be edited per-project when a real domain shows up
  B. Change DB: user → tourist (Xibalbá-faithful)
     pros: matches Xibalbá's tourism domain
     cons: the TEMPLATE is supposed to be generic — tourist isn't a generic role
  C. Use serde rename to map Tourist→"user"
     pros: no schema change
     cons: hides the mismatch; fragile on future field additions
CHOSEN: A (rename Rust Role::Tourist to Role::User)
REASON: server.md explicitly frames this as a template with core entities (user, item). Role
        names should follow the template. Xibalbá's "tourist" was domain-specific and should
        stay in the Xibalbá containers, not leak into the template.
REVISIT IF: Never — this is the template's source of truth.
```

```
DECISION: Native vs containerized engine/rpc for local dev
OPTIONS CONSIDERED:
  A. Native cargo run + go run in dev; containers in CI
     pros: fast iteration (< 2s Rust rebuilds); debugger works; no image churn
     cons: environmental drift possible (OpenSSL versions, etc.)
  B. Containerized everywhere
     pros: perfect reproducibility; no "works on my machine"
     cons: 5+ minute rebuild cycles destroy the dev loop
  C. Native everything including DB
     pros: fastest possible
     cons: user explicitly said "I'm not using surreal on local"
CHOSEN: A (native dev, containerized CI)
REASON: User preference + reality: Rust's compile time is the bottleneck. A template must
        not ship with a 5-minute feedback loop. Nix flake gives enough environmental
        consistency for dev; CI catches the rare drift.
REVISIT IF: A regression is traced to native-vs-container drift (it will be obvious).
```

```
DECISION: gRPC client strategy for the test suite
OPTIONS CONSIDERED:
  A. Keep untyped JSON-over-HTTP (current lib/client.ts)
     pros: works today; no codegen; one fetch call
     cons: assumes Connect protocol; silent drift from proto contract
  B. Migrate to @connectrpc/connect with generated TS types
     pros: type safety; proto is source of truth
     cons: only works IF sidecar speaks Connect protocol
  C. Migrate to nice-grpc for raw gRPC over HTTP/2
     pros: works with raw gRPC
     cons: Deno support is shaky; more deps
CHOSEN: Spike protocol first (Phase 3.0), then decide between A and B
REASON: This is the #1 open question in server-test.md. A 30-minute spike checking whether
        main.go uses grpc.NewServer() (raw) or connect-go resolves it. The current A-approach
        works only by accident if the sidecar happens to support JSON-over-HTTP transcoding.
REVISIT IF: Sidecar protocol changes (then regen types and move on).
```

```
DECISION: Where to define ports and env vars
OPTIONS CONSIDERED:
  A. Single .env.example checked in; each service reads from env
     pros: one source of truth; 12-factor-style
     cons: must keep defaults in code for the case where .env is missing
  B. Hardcode in docker-compose and just recipe; no .env
     pros: nothing to forget
     cons: changing a port requires hunting through multiple files
  C. .env + justfile variables that pin defaults
     pros: override-friendly
     cons: two layers of config
CHOSEN: A + C hybrid (.env.example with defaults mirrored in justfile)
REASON: The .env.example documents intent. Justfile defaults mean a fresh clone works
        without copying the .env file. Runtime code (Rust AppConfig, Go config.go) also
        has defaults as a last line of defense.
REVISIT IF: Config drift happens across the three layers (add a validation recipe).
```

---

## 6. Phased Implementation Plan

### Phase 1 — Schema Reality Check [COMPLETED]

- **Goal**: Fix the real bugs before layering orchestration on top. The failing G1 CASCADE test and the role/user mismatch are deeper than wiring — they'd fail even if the stack were running.
- **Components built**:
  1. Added `DEFINE FIELD sessions ON user TYPE references<session>;` to `01-schema/02-fields.surql`.
  2. Renamed `Role::Tourist` → `Role::User` in `domain/src/entities/user.rs` and across the codebase.
  3. Added missing User fields to the template's `02-fields.surql`.
  4. Updated the Rust store `tests.rs` with full `Item` construction.
  5. Updated the test seed's `02-users.surql` to use `role: 'user'` and included new fields.
- **Exit criteria**:
  - `podman-compose down -v && podman-compose up -d --build` rebuilds the DB image with the fixed schema. [Ready for validation]
  - Running JUST the DB tests yields 13/13 green. [Ready for validation]
  - `cargo check --all-targets` in engine/ passes. [Ready for validation]
  - `cargo test -p store` passes once DB is running. [Ready for validation]

---

### Phase 2 — Process Orchestration [COMPLETED]

- **Goal**: `just server run` starts everything. `Ctrl-C` stops everything. No more "forgot to start the engine" failures.
- **Components built**:
  1. Extended `flake.nix` with `deno`, `go`, `rustup`, and `grpcurl`.
  2. Created `src/server/.env.example` with canonical defaults.
  3. Created `src/server/scripts/run-stack.sh` shell supervisor with signal traps.
  4. Updated `src/server/server.just` with `run`, `down`, `status`, `logs`, and `fitness` commands.
- **Exit criteria**:
  - Fresh terminal → `nix develop` → `just server run` → within 15s: DB healthy, API ready, RPC ready. [Ready for validation]
  - `Ctrl-C` → all three services gone, no orphans. [Ready for validation]
  - `just server status` accurately reports health. [Ready for validation]

---

### Phase 3 — Test Suite Hardening [COMPLETED]

- **Goal**: `just server test` gives fast, accurate, useful feedback. When the stack is down, tell the user which service and how to fix it.
- **Components built**:
  1. `tests/lib/health.ts` with `probeSurreal()`, `probeApi()`, `probeRpc()`.
  2. `tests/lib/errors.ts` with `StackUnavailableError`.
  3. Modified fixtures (`surreal_env.ts`, `api_env.ts`, `rpc_env.ts`) to call probes.
  4. Created `tests/preflight.ts` standalone script for status table.
  5. Updated `deno.json` tasks with `preflight` check.
  6. Fixed `printSummary()` to always run in `finally` blocks via `resetCounts()`.
  7. **Spike**: Confirmed Go sidecar uses raw gRPC. Added `buf` and `proto` build steps to `server.just`.
- **Exit criteria**:
  - `just server down && just server test` → clear "DOWN" status and fix instructions. [PASSED]
  - Fixtures throw readable errors if services go down mid-test. [PASSED]
  - Accurate pass/fail counts in summary. [PASSED]

---

### Phase 4 — Full Containerization for CI

- **Goal**: A CI machine with only Docker installed can run the full stack and the full test suite.
- **Components to build**:
  1. `engine/Dockerfile` — multi-stage:
     - Stage 1 (builder): `rust:1.83-bookworm`, copy workspace manifest files first, `cargo fetch`, then copy sources and `cargo build --release -p gateway`.
     - Stage 2 (runtime): `debian:bookworm-slim`, copy the binary only, expose :3000, ENTRYPOINT the binary.
     - `.dockerignore` excludes `target/`, `.git/`, `tests/`.
  2. `rpc/Dockerfile` — same multi-stage pattern with `golang:1.23-bookworm` builder.
  3. Extend `db/docker-compose.yml` → rename to `docker-compose.yml` at server root, add `engine` and `rpc` services with `depends_on: { surrealdb: { condition: service_healthy } }`.
  4. Add health checks to engine and rpc services (both expose a trivial `/healthz` or similar — if not, use TCP-level `nc -z`).
  5. Add a `just server up-all` recipe that uses docker-compose for all three (the all-container path, distinct from dev-mode `run`).
  6. Validate: `podman-compose up` builds all three and runs the full suite against them (on non-default ports if needed to avoid conflict with native dev).
- **Dependencies**: Phase 2 done (need to know the startup commands and health checks before containerizing).
- **Exit criteria**:
  - `podman-compose build` completes for all three in under 5 minutes on a cold cache, under 30s on warm cache.
  - `podman-compose up` brings the full stack up with all health checks green.
  - `cd tests && deno task test` run from outside the containers (hitting the exposed ports) passes the full suite.
  - Final image sizes: engine < 150MB, rpc < 50MB.
- **Risk flags**: [MEDIUM RISK] cargo-chef is nice-to-have for cache optimization but adds complexity. Start without it — if builds are slow, add it in Phase 5. [LOW RISK] Image tagging scheme must be agreed upon (use `:dev` for local, `:$GIT_SHA` + `:main` in CI).

---

### Phase 5 — CI/CD Pipeline

- **Goal**: Every PR runs the full suite. Green check or block merge.
- **Components to build**:
  1. `.github/workflows/server-ci.yml`:
     - Trigger: PRs to main, pushes to main.
     - Jobs: `lint` (runs `just server lint`), `test` (runs `just server up-all` then `just server test`), `typecheck` (runs `just server typecheck`), `fitness` (runs `just server fitness`).
     - All jobs run inside `ubuntu-latest` with docker + nix installed.
     - Cache: Rust target dir, Go modules, Deno cache. Keyed on respective lockfiles.
  2. Branch protection on main requires all four jobs to pass.
  3. Add `just server lint` (delegates to cargo fmt --check, cargo clippy, deno lint, go vet).
  4. Add `just server typecheck` (cargo check --all-targets, deno check, go build -o /dev/null).
- **Dependencies**: Phase 4 done (CI depends on containers).
- **Exit criteria**:
  - Open a test PR with a deliberate schema break (e.g., remove the role ASSERT). CI fails with a clear test error pointing at the A2 test.
  - Open a PR with a fitness violation (e.g., add surrealdb to domain/Cargo.toml). `fitness` job fails.
  - Happy path PR: all four checks green in < 8 minutes on warm cache.
- **Risk flags**: [LOW RISK] GitHub Actions occasionally has docker-in-docker quirks. Fallback: run native on the runner with nix installing deps.

---

### Phase 6 — Architecture Fitness & Template Polish

- **Goal**: The template is genuinely copy-pasteable. Architectural rules are enforced automatically. Docs reflect reality.
- **Components to build**:
  1. `just server fitness` recipe runs:
     - Grep `domain/Cargo.toml` must NOT contain `surrealdb`, `axum`, `tonic`, `async-graphql`.
     - Grep `application/Cargo.toml` must NOT contain `axum`, `tonic` (only `domain` + utils).
     - Grep `tests/**/*.test.ts` must NOT contain raw `fetch(` — all HTTP goes through `lib/client.ts`.
     - Grep `tests/**/*.test.ts` must NOT contain `Authorization` string literal — all auth goes through fixtures.
     - Verify every `.surql` file lives in a numbered directory matching the pipeline order.
  2. Rewrite `README.md`:
     - Quickstart: `nix develop` → `just server run` → `just server test`.
     - Architecture diagram (reuse the one in this spec).
     - Feature matrix (what each DB feature demonstrates).
     - Troubleshooting (top 3 gotchas: ports in use, podman not running, nix shell not loaded).
  3. Template cleanup checklist in `TEMPLATE.md`: what to rename, what to delete, when cloning for a real project.
  4. Pre-commit hook (via git hooks or `just server pre-commit`) that runs fmt + lint + typecheck.
  5. Add `just server doctor` that diagnoses common issues (ports, env vars, missing deps) and prints fixes.
- **Dependencies**: All prior phases.
- **Exit criteria**:
  - A developer unfamiliar with the repo clones it, follows README, reaches green in < 5 minutes.
  - `just server fitness` catches a planted violation (test in CI with a deliberately-broken domain Cargo.toml).
  - Running `just server doctor` on a fresh macOS without podman prints "Podman not installed. Install via 'brew install podman'."
- **Risk flags**: None. This is polish.

---

## 7. Implementation Management

### Sequencing (strict)

```
Phase 1 (Schema fixes)              ← zero deps, start here
    ↓
Phase 2 (Orchestration)             ← needs Phase 1 to validate "everything works"
    ↓
Phase 3 (Test hardening)            ← needs Phase 2 to have a live stack to probe
    ↓                                   └── gRPC protocol spike gates Phase 3 completion
Phase 4 (Containerization)          ← needs Phase 2 (knows startup cmds)
    ↓
Phase 5 (CI)                        ← needs Phase 4 (needs containers)
    ↓
Phase 6 (Polish)                    ← needs everything
```

Phases 1 and 2 can overlap slightly (the role rename from Phase 1 doesn't block orchestration work). Phases 4 and 5 are tightly coupled — do them together.

### Critical Path

```
Fix references<session> → Fix role enum → just server run (shell supervisor) →
gRPC protocol spike → fixture health probes → Dockerfiles → CI workflow
```

The gRPC protocol spike is the single highest-risk item on the critical path. Do it before writing a single line of new RPC test code.

### Integration Points

1. **DB schema change ↔ Rust entity shape**: Phase 1 changes both sides simultaneously. Verify deserialization with the `cargo test -p store` integration tests against a freshly-built DB container.
2. **`just server run` ↔ test suite health probes**: Phase 2 produces the startup command; Phase 3 produces the probe that validates startup. They must agree on ports. Codify this in `.env.example`.
3. **Dockerfile EXPOSE ↔ docker-compose port mappings ↔ test suite URLs**: Three places where a port number must match. Use compose env var substitution from `.env` as the single source of truth.
4. **CI workflow ↔ justfile recipes**: The golden rule — CI must not have logic that isn't in justfile. Verify this by running the CI workflow locally with `act` or similar.

### Breaking Changes

- [HIGH RISK] **Renaming `Role::Tourist` to `Role::User`** (Phase 1): Any existing code consuming `Role::Tourist` breaks. Search the whole Rust workspace before renaming. This is a template — there should be no callers outside the domain, but verify.
- [HIGH RISK] **Adding fields to the User schema** (Phase 1): Existing seeded users in `02-users.surql` must include the new required fields, or they'll fail SCHEMAFULL validation. Either make fields optional or extend seed data.
- [MEDIUM RISK] **Introducing `references<session>` on user** (Phase 1): If any existing seed creates users before creating any session-related structure, the field's default handling matters. Test with a clean DB volume (`podman-compose down -v`).
- [MEDIUM RISK] **Extending docker-compose.yml with engine + rpc services** (Phase 4): Devs who do `podman-compose up` expecting only DB now get three services. Either gate behind a profile (`--profile all`) or document clearly.
- [LOW RISK] **Moving `docker-compose.yml` from `db/` to server root** (Phase 4): Anyone with muscle memory runs the old path. Keep a symlink or delete and document.

---

## 8. Validation & Testing Strategy

### Test Matrix

| Layer | Test Type | What it verifies | How to run |
|---|---|---|---|
| DB schema constraints | Unit (Deno) | ASSERTs reject invalid data, unique indexes work | `just server test db:unit` |
| DB events + graph + functions | Integration (Deno) | Event side effects, traversals, fn:: calls | `just server test db:integration` |
| Rust store repos | Integration (cargo) | CRUD + fn:: calls against live DB | `cargo test -p store -- --test-threads=1` |
| GraphQL auth + CRUD | Integration (Deno) | Login/token lifecycle, resolvers | `just server test api` |
| gRPC methods | Integration (Deno) | Each service method's contract | `just server test rpc` |
| Full-stack flows | E2E (Deno) | Create item via GraphQL → gRPC triggers → DB updates | `just server test e2e` |
| Security properties | Security (Deno) | Auth required, fields protected, inputs sanitized | `just server test security` |
| Pre-flight | Health probes | All three services reachable | `just server test:preflight` |
| Architecture fitness | CI (shell) | Domain purity, no cross-layer imports, no raw fetch in tests | `just server fitness` |
| Config drift | CI (shell) | Ports in .env match compose and justfile | `just server doctor` |

### Architecture Fitness Functions

1. **Domain purity**: `domain/Cargo.toml` must not depend on `surrealdb`, `axum`, `tonic`, `async-graphql`, `jsonwebtoken`.
2. **Application isolation**: `application/Cargo.toml` must not depend on any transport crate.
3. **No raw fetch in tests**: Grep `tests/**/*.test.ts` for `fetch(` — must return zero matches.
4. **No auth literals in tests**: Grep `tests/**/*.test.ts` for `Bearer` or `Authorization` — must return zero matches.
5. **Pipeline order integrity**: Every `.surql` file lives in a directory matching `0N-<name>/`.
6. **Seed determinism**: Running `just server run` twice back-to-back produces identical DB state — nothing depends on execution order beyond the pipeline.
7. **No orphan processes**: After `just server down`, `pgrep -f "gateway|rpc-server|surreal"` returns empty.

### Local Dev Validation (the dev's checklist)

1. `nix develop` → shell shows `🦇 GWA Server` banner with versions.
2. `just server run` → within 15s, three health-green services.
3. `just server test` in another terminal → full suite passes.
4. Kill one service (e.g., `kill $(pgrep gateway)`) → rerun `just server test` → only the relevant tests fail with readable errors.
5. `just server down` → clean shutdown, no orphans.

### Observability

- DB: podman logs + SurrealDB's own `--log` flag (already wired via `SURREAL_LOG` env).
- Engine: `tracing` crate with structured logs; `TraceLayer::new_for_http()` wraps every request.
- RPC: `slog` with the lipgloss PrettyHandler (already implemented).
- Test suite: emoji group prefixes (🗄️ 🦀 🐹 🚀 🔐), `printSummary()` at each group's end.
- `just server logs` tails all three in one stream with color-coded prefixes.

---

## 9. Open Questions & Risks

### Open Questions

1. **gRPC protocol of the Go sidecar** — Raw gRPC or Connect? This is the single most important unknown. Resolve in Phase 3 via a 30-minute spike reading `rpc/cmd/server/main.go`. If raw gRPC, the test client changes. [HIGH IMPACT if unresolved]
2. **Should the `fetchTemplate` PostgREST quirk in `notifier/service.go` be fixed in this plan?** — It currently calls a URL that doesn't match any service in the template (looks like a carry-over from a Supabase-based ancestor). Decision: out of scope for this plan, but file as a separate issue. The notifier still works for the test (templates can be passed inline).
3. **`Option` vs. default for event-populated fields** — When an item has zero comments, does the DB return `rating: 0` or `rating: null`? The Rust entity uses `Option<f64>`, which handles both. Verify in Phase 1's schema work — no change needed if both are tolerated.
4. **Subscription test timing** — The GraphQL subscription for live item updates needs a deterministic timeout. Start with 3s poll loop, adjust if flaky.
5. **macOS podman machine lifecycle** — On macOS, podman runs in a VM that must be `podman machine start`'d before anything works. Should `just server run` auto-start it? Decision: no (it's noisy on Linux). Add to `just server doctor` detection instead.

### Risks

1. **[HIGH RISK] gRPC protocol mismatch**: If the RPC tests pass only because the sidecar accidentally tolerates JSON requests (or because Deno's fetch is forgiving), any real usage from a typed client would fail. Confirm the protocol before certifying "RPC tests green" in Phase 3.
2. **[MEDIUM RISK] `podman-compose` vs. `docker-compose` behavioral drift**: The flake provides `podman-compose` but some CI environments have `docker-compose`. They mostly agree, but healthcheck syntax and `depends_on` conditions diverge on edge cases. Test both if possible.
3. **[MEDIUM RISK] Cargo workspace compile time in CI**: Even with caching, first-build of the engine on a cold runner can hit 10+ minutes. Mitigate with aggressive cache keys (keyed on Cargo.lock) and splitting lint/test/typecheck into parallel jobs.
4. **[LOW RISK] JWT secret rotation semantics**: The `JWT_SECRET` default is `"default_secret"`. Any real deployment must override. Tests use a hardcoded secret that must match between Rust and Go. Verify in Phase 3 that both services read from the same env var.
5. **[LOW RISK] Nix flake reproducibility on non-Linux**: The flake is tested on Linux. macOS users may see different behavior for podman, shell traps, and signal handling. Add a `just server doctor` check for platform-specific issues.
6. **[LOW RISK] Schema reload without volume reset**: `just server run` on a machine with existing `surreal_data` volume will not reload schema changes from `init/`. Phase 2 should document that `podman-compose down -v` is needed after schema changes.

---

## Appendix: Fast-Path Checklist (the "wire it up" TL;DR)

For the impatient reader, the minimum sequence to get green is:

1. **Schema**: Add `sessions references<session>` to user table. Rename `Role::Tourist → Role::User`. Add User fields to DB schema.
2. **Rebuild**: `podman-compose down -v && podman-compose build --no-cache && podman-compose up -d`.
3. **Orchestration**: Rewrite `just server run` to also start engine + rpc with signal traps.
4. **Pre-flight**: Add health probes to fixtures so bad errors become good errors.
5. **Spike**: Confirm Go sidecar's gRPC protocol. If Connect, keep current client. If raw gRPC, swap to `nice-grpc`.
6. **CI**: Wrap it all in a GitHub Actions workflow that calls `just server test`.
7. **Fitness**: Add `just server fitness` to prevent regression.

Everything else is polish.
