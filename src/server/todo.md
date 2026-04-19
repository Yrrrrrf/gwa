# 🔌 GWA Server · Wire Validation Spec

**Status:** Canonical v2 · Supersedes scope for Phases ≥ 2 of the prior spec.
**Premise:** Phase 1 is complete. Phase 2 is **~90% complete** (SDK clients landed, preflight retired, `describe`/`it`/`expect` migration done). Only a single harness fix and a set of documented wire-gap tests remain before this phase closes. Everything downstream of Phase 2 is new scope: **tri-path validation** — every backing service is exercised through at least two independent entry points so that when a wire breaks, the test report localizes the break rather than masking it.
**Voice:** Strict-specification. `SHALL` / `MUST` / `MUST NOT`. Phases close on executable exit commands.
**Explicitly out of scope:** Fixture-injection polish (previous Phase 5), fitness functions / ESLint rules (previous Phase 6's enforcement surface), custom reporter. These are not goals and MUST NOT be added.

---

## 0. Executive Summary

The test suite finishes its transport-normalization work (close Phase 2), then gains **a second independent test path for every backing service** — Hurl against the SurrealDB `/sql` endpoint, `go test` plus `grpcurl` against the Go sidecar, and the existing `vite-plus/test` TS clients (which are the *canonical consumer* path). Three independent paths means every wire is triangulated: if the engine breaks `createItem` but the `surrealdb` SDK path and the Hurl path both succeed against the DB, the report immediately points to the engine — not to the DB, not to the harness. This gives you the "bulletproof" property you want: a failing test no longer poses a question, it answers one. The design is **test-driven**: tests encode expected behavior first, implementation catches up; a test that *should* fail until a wire is fixed is marked explicitly with `it.fails(reason)` and tracked in `tests/TODOS.md`, so red output is either a regression or an untracked gap — never noise. Delivered in five phases (A → E) gated by executable exit commands. Approximately 1–2 days of work per phase for a solo developer in `nix develop`.

---

## 1. Context & Constraints

### 1.1 Current state (verified from the 2026-04-19 test run output)

| Signal | State |
|---|---|
| Preflight banner | ✓ prints 🗄️ 🦀 🐹 all UP; format matches §3.3 of prior spec |
| Migration to `vite-plus/test` | ✓ complete; `describe` / `it` / `expect` / `vi` throughout |
| `@std/assert` / `Deno.test` usage | ✓ removed from `tests/` |
| `vp test` runner | ✓ canonical; Bun executes it (`bun@1.3.3`) |
| SurrealDB SDK adapter | ✓ wired in `tests/lib/clients/surreal.ts`; DB specs green |
| Engine GraphQL adapter | ✓ wired; 1/2 specs green (bug documented below) |
| RPC Connect-ts adapter | ✘ **harness bug**: `createConnectTransport` sends HTTP/1.1 to a raw grpc-go server → `ECONNRESET` on every call |
| Engine `createItem` mutation | ✘ **wire bug (real)**: `comment_count` field is `TYPE int` without a `DEFAULT 0`; the engine's CREATE doesn't set it; SurrealDB rejects the post-create event write with `Expected int but found NULL` |
| `preflight.ts` standalone | still present but logic duplicated by `globalSetup`; deletion pending |
| Hurl inner-ring suite | ✘ does not exist |
| Go inner-ring suite | ✘ does not exist (`rpc/internal/*_test.go` absent) |
| Per-service justfile split | Assumed ✓ from prior Phase 0; **if not yet done, do it as part of Phase A** |

**The two failures in the current run mean different things.** The RPC `ECONNRESET` is a **harness** failure — wrong transport selected — and blocks Phase 2 closure. The engine `comment_count` failure is a **real wire bug** — correctly surfaced by the test. Phase A closes the harness failure and formally recognizes the wire bug as tracked-and-expected. The wire bug stays red (via `it.fails` discipline) until the engine ships a fix — and the test suite will automatically flip green when it does, with zero test-code changes required. That is the test-driven property.

### 1.2 Explicit architectural rules (inherited, non-negotiable)

- Nix shell is the authoritative toolchain. `nix develop` is the precondition for every recipe.
- Fixed ports: Surreal `:8000`, Engine `:3000`, RPC `:4000`. No dynamic ports.
- Shared `JWT_SECRET` between Engine and RPC and test-time minter (`tests/lib/tokens.ts`).
- Surreal namespace `template`, DB `main`, dev credentials `root/root`.
- Hexagonal Rust boundaries in `engine/` unchanged by this spec.
- GraphQL is the only public entry on the Engine (:3000).

### 1.3 Goals of this specification

1. **Close Phase 2** by fixing the transport bug and retiring `preflight.ts`.
2. **Add a Hurl inner ring for `db/`** that exercises the SurrealDB HTTP contract directly, *without* any SDK — so that a failure in the JS SDK adapter can be distinguished from a failure in the DB schema.
3. **Add a Go inner ring for `rpc/`** using `go test` for pure-Go logic and a `grpcurl`-driven smoke script for live-server validation — so that a failure in Connect-ts can be distinguished from a failure in the Go sidecar itself.
4. **Achieve tri-path validation**: every wire has at least two independent verifications. When a wire breaks, the report's color pattern identifies the faulty segment.
5. **Embed test-driven discipline**: every red test is either a regression or a tracked `it.fails` gap. No silently red tests, no silently skipped tests.
6. **Delete what is obsolete**: `preflight.ts`, `deno.json` (if the suite no longer uses Deno), `lib/client.ts` legacy aggregate — all must go.

### 1.4 Out of scope (explicit, strict)

- `test.extend` fixture migration (prior Phase 5). The closure-based `withSurrealEnv`/`withApiEnv`/`withRpcEnv` harness stays. If it works, leaving it in place costs nothing and re-migration-fatigue is real.
- ESLint / architectural-rule enforcement (prior Phase 6). No rules. No plugins. Manual discipline only.
- Custom Vitest reporter. The default reporter is acceptable.
- CATALOG.md generator. Optional in Phase E, not a goal.
- GraphQL schema snapshot / Proto descriptor snapshot tests. Nice-to-have, not in this plan.
- Engine source changes. The `comment_count` bug is documented, not fixed, by this specification.
- RPC sidecar server-side changes. No Go source change is required for any phase in this plan.

### 1.5 Assumptions (flag explicitly; push back if wrong)

- **[ASSUMPTION-A1]** `@connectrpc/connect-node` is the correct runtime package (not `@connectrpc/connect-web`) because the test suite runs under Bun/Node, not in a browser.
- **[ASSUMPTION-A2]** The Go sidecar uses stock `google.golang.org/grpc` on HTTP/2 without TLS (H2C). Verified indirectly: `grpcurl -plaintext localhost:4000` works today. Under H2C, `createGrpcTransport` works out of the box; no Node `ALPN` workaround needed.
- **[ASSUMPTION-A3]** Hurl (≥ 4.x) is available in the Nix shell. If not, add it to `flake.nix`.
- **[ASSUMPTION-A4]** The SurrealDB init seed in `db/init/05-seed/*.surql` produces stable fixture IDs (`user:alice`, `user:bob`, `item:hiking_boots`) that Hurl tests can reference by ID without needing dynamic lookup.
- **[ASSUMPTION-A5]** The `just` version in Nix (≥ 1.19) supports `mod` imports as declared in the prior spec's Phase 0. If this was not yet done, Phase A includes it as prerequisite setup.
- **[ASSUMPTION-A6]** Vitest's `it.fails(reason)` and `it.todo(reason)` APIs are stable and render in the reporter as distinct from `it.skip` and from regular failures.

---

## 2. Architecture Overview

### 2.1 Tri-Path Validation Model

Every backing service is reachable through **three** test paths, two of which are mandatory. When all three paths agree, confidence is high. When they disagree, the pattern of disagreement localizes the fault.

```
                    ┌─────────────────────────────────┐
                    │      SurrealDB  (:8000)         │
                    └──┬──────────────┬──────────────┬┘
                       │              │              │
                  ┌────▼────┐    ┌────▼────┐   ┌────▼──────┐
                  │  HURL   │    │ SURREAL │   │ ENGINE    │
                  │ direct  │    │ JS SDK  │   │ GraphQL   │
                  │ /sql    │    │ via TS  │   │ round-trip│
                  │ (inner) │    │ (outer) │   │ (e2e)     │
                  └─────────┘    └─────────┘   └───────────┘
                    db/tests/*    tests/unit/db/   tests/e2e/
                    db/tests/*    tests/integration/db/

                    ┌─────────────────────────────────┐
                    │      Rust Engine  (:3000)       │
                    └──┬──────────────┬──────────────┬┘
                       │              │              │
                  ┌────▼────┐    ┌────▼────┐   ┌────▼──────┐
                  │ CARGO   │    │ GRAPHQL │   │ E2E       │
                  │ TEST    │    │ via TS  │   │ multi-hop │
                  │ (inner) │    │ client  │   │ scenarios │
                  │         │    │ (outer) │   │           │
                  └─────────┘    └─────────┘   └───────────┘
                    engine/**     tests/integration/engine/  tests/e2e/
                    cargo test    GraphQL client

                    ┌─────────────────────────────────┐
                    │      Go RPC Sidecar  (:4000)    │
                    └──┬──────────────┬──────────────┬┘
                       │              │              │
                  ┌────▼────┐    ┌────▼────┐   ┌────▼──────┐
                  │ GO TEST │    │ GRPCURL │   │ CONNECT-TS│
                  │ + unit  │    │ smoke   │   │ via TS    │
                  │ (inner) │    │ (inner) │   │ (outer)   │
                  └─────────┘    └─────────┘   └───────────┘
                    rpc/**/*      rpc/tests/*      tests/integration/rpc/
                    go test       grpcurl script   Connect-ts client
```

### 2.2 Failure-pattern decoding

This is the payoff of triangulation. A failure in one path alone points to a specific culprit:

| Pattern | Localizes to |
|---|---|
| Hurl **red**, SurrealDB SDK **red**, Engine **red** | The **DB schema or seed** (all three paths hit the same underlying state) |
| Hurl **green**, SurrealDB SDK **red**, Engine any | The **SurrealDB SDK adapter** (`tests/lib/clients/surreal.ts`) |
| Hurl **green**, SurrealDB SDK **green**, Engine **red** | The **engine's domain/store/adapter layer** (today: `comment_count` bug) |
| Connect-ts **red**, grpcurl smoke **green**, Go unit tests **green** | The **TS adapter or Connect-ts transport config** (today: was wrong transport) |
| Connect-ts **red**, grpcurl smoke **red**, Go unit tests **green** | The **Go handler or server lifecycle** |
| All outer **red**, all inner **green** | The **harness or JWT parity** |

A specification for "bulletproof" has to define what "bulletproof" means operationally. This table is it.

### 2.3 Test-driven discipline — marker vocabulary

Red output MUST be one of exactly three kinds:

1. **Regression** — previously-green test is now red. This is the "stop the line" case.
2. **Tracked gap** — `it.fails(reason)` marker. Test *expects to fail* against today's implementation; passes when implementation catches up. Every marker MUST link to an entry in `tests/TODOS.md`.
3. **Aspirational** — `it.todo(reason)`. Test is not yet implemented. Renders as a distinct "todo" in the reporter, not as red.

Yellow output MUST be `describe.skipIf(!services.X, reason)` — service is not running. Not a failure.

The rule is strict: a test that is red for any reason other than #1 or #2 MUST be fixed or marked. A test suite with mystery reds is a broken contract.

---

## 3. Design Patterns & Code Standards

### 3.1 Connect-ts Transport Selection (strict)

- **Rule:** The TS client for the RPC sidecar SHALL use `createGrpcTransport` from `@connectrpc/connect-node`. `createConnectTransport` MUST NOT be used.
- **Why:** `createConnectTransport` speaks the Connect protocol (HTTP/1.1 POST with JSON or binary, no framing). `createGrpcTransport` speaks raw gRPC (HTTP/2, protobuf, Trailer-based status). The Go sidecar serves raw gRPC. Protocol mismatch surfaces as `ECONNRESET` — which is exactly what today's test output shows.
- **Constraint:** The transport is constructed **once per suite run** inside `lib/clients/rpc.ts` using `baseUrl: "http://localhost:4000"` (or whatever `services.urls.rpc` resolves to). No per-test transport construction.
- **Future-proofing:** If the sidecar ever gains Connect-protocol support (via `connect-go`), a second adapter MAY be added alongside (`createRpcClientConnect`) — but the default adapter name (`createRpcClient`) stays pinned to the gRPC transport because it matches what `grpcurl` can also hit, preserving triangulation.

### 3.2 Hurl as the DB Inner Ring (strict)

- **Rule:** `db/tests/*.hurl` SHALL hit the SurrealDB HTTP endpoint directly — `POST http://localhost:8000/sql` with Basic auth and the `Surreal-NS` / `Surreal-DB` / `Accept: application/json` headers. No client library. No proxy. Raw HTTP.
- **Why:** Hurl tests the DB's *external contract*. They cannot be fooled by a bug in the `surrealdb` JS SDK, because they don't use it. They also cannot be fooled by a bug in the engine or sidecar, because they don't talk to either. A green Hurl run means "the DB honors the contract as queried directly."
- **Eventual consistency:** SurrealDB's event-driven fields (`comment_count`, activity writes) can lag the causing statement by tens of milliseconds. Hurl specs SHALL use `[Options] retry: 5` / `retry-interval: 100ms` for any assertion that depends on an event having fired. This replaces the imperative `setTimeout(100)` currently scattered through TS specs.
- **Data isolation:** Hurl specs SHALL use randomized suffixes for any record ID they create, via Hurl variables populated from `--variable` flags set by the calling justfile recipe. Seed records (`user:alice`, `item:hiking_boots`) MAY be referenced by fixed ID for read-only assertions.
- **Conventions — strict:**
  - One capability per file. Filename = capability (e.g., `unique-email.hurl`, `cascade-delete.hurl`, `search-function.hurl`).
  - First request in every file is a health check: `GET http://localhost:8000/health HTTP 200`. Fails fast if DB is down.
  - All subsequent requests inherit Basic auth via `--user root:root` passed by the justfile.
  - Every `[Asserts]` block includes `status == 200` explicitly even when it would be implicit (defensive — SurrealDB returns 200 with an error payload for SQL errors; status alone isn't enough).
  - Use `jsonpath "$[*].status" not contains "ERR"` to catch embedded SurrealQL errors.
  - Use `[Captures]` for IDs that need to be referenced by later requests in the same file.
  - Comments (lines starting with `#`) MUST explain *why* each assertion exists, not *what* — the `[Asserts]` clauses already say what.

### 3.3 grpcurl + go test as the RPC Inner Ring (strict)

- **Rule split:**
  - **Pure Go logic** (interceptors parsing claims, handler→status mapping, queue behavior) SHALL live in `rpc/internal/**/*_test.go` as standard `go test` files. No grpcurl. No live server. Table-driven tests.
  - **Live-server smoke** SHALL live in `rpc/tests/grpcurl.sh` (or `rpc/tests/*.hurl` against the gRPC-via-HTTP endpoint where grpc-go exposes one, or a small Go integration-test binary in `rpc/tests/`) — which exercises a running sidecar with real JWT metadata.
- **Why two flavors:**
  - `go test` covers logic that has nothing to do with transport (e.g., "does the interceptor reject an expired JWT?"). These run in CI without standing up the server. Fast.
  - grpcurl smoke verifies the server responds to real gRPC traffic with real auth. Covers the "server is alive and routing correctly" gap that unit tests cannot.
- **Token discipline:** The grpcurl smoke SHALL mint its JWT the same way `tests/lib/tokens.ts` mints — using `JWT_SECRET` from the shared `.env`. A small helper (`rpc/tests/bin/mint-token` — a 30-line Go program, or a `jose`-cli invocation) produces the token. The token-minting helper is callable from both go test and the shell script.
- **grpcurl command shape (reference, not prescription):** the script invokes `grpcurl -plaintext -H "authorization: Bearer <token>" -d '<json body>' localhost:4000 template.v1.NotifierService/Dispatch` and asserts the exit code + (optionally) `jq`-filters the output.
- **Failure reporting:** the shell script SHALL emit `FAIL: <service>/<method>: <reason>` on error and exit non-zero. Multiple assertions aggregate: the script continues through all of them (like Hurl's `--continue-on-error`) and reports a summary at the end.

### 3.4 TDD Markers (strict, non-negotiable)

Every `.test.ts` file in `tests/` SHALL follow these rules for how tests signal state:

| Intent | Mechanism | Reporter color | TODOS.md entry |
|---|---|---|---|
| Service unavailable (DB/Engine/RPC down) | `describe.skipIf(!services.<s>, "<reason>")` | Yellow skip | No |
| Test not yet written | `it.todo("<capability description>")` | Cyan todo | Yes (optional) |
| Test written; wire currently broken; expected to pass after fix | `it.fails("<reason> — see TODOS.md#<anchor>")` | Green when failing / red when passing (inverted) | **Yes (required)** |
| Test written; wire works; expected to pass | `it("<capability>", ...)` | Green | No |
| Regression | any of the above failing unexpectedly | Red | N/A — fix immediately |

**`it.fails` rule set:**
- The `reason` string MUST begin with `"expected to fail until "` followed by a one-line summary, then ` — see TODOS.md#<anchor>`.
- `tests/TODOS.md` MUST have a corresponding anchor section describing the bug, the expected fix location (e.g., "engine/core/store/src/repos/item.rs"), and — if the fix has a tracking issue — the issue URL or number.
- When the implementation is fixed, the test flips red (because `it.fails` now sees a passing test, which it reports as a failure). The developer then **deletes the `.fails`** (making it a normal `it`) and removes the TODOS.md entry. This is how the discipline self-corrects.

**Example entry shape for TODOS.md (prose description, not code):** A level-2 heading with the anchor slug, a one-paragraph description of the bug including the exact error string that surfaces, the expected fix location in source, a recommended fix approach, and a reference back to the `.fails`-marked test(s) by file path and test name.

### 3.5 Justfile Additions (per module)

Each peer's justfile gains new recipes. Rules from the prior spec apply (naked verbs inside modules, delegation only at root, `[doc]` + `[group]` on every recipe).

**`db/db.just` additions:**
- `test` — runs `hurl --test --variables-file tests/.env tests/*.hurl`. Loads `root/root` and the namespace variables.
- `test-one FILE` — runs a single Hurl file (useful for debugging). `just db::test-one schema.hurl`.
- `test-report` — runs Hurl with `--report-html out/hurl-report` for a browsable report.

**`rpc/rpc.just` additions:**
- `test` — runs `go test ./...` in the `rpc/` module.
- `test-smoke` — runs `tests/grpcurl.sh` against a live sidecar. Requires `:4000` up.
- `test-all` — chains `just rpc::test && just rpc::test-smoke`.

**`tests/tests.just`** — no new recipes beyond what Phase 0/Phase 1 already defined; the existing `test`, `test-db`, `test-engine`, `test-rpc`, `test-e2e` cover all the TS-side surface.

**Root `server.just` composition (strict):**
- `test-db` — delegates to `just db::test && just tests::test-db`. Inner ring first, then outer. If Hurl fails, the TS-outer-ring run is still informative for triangulation, so both SHALL run even if the first fails — use `just db::test; just tests::test-db` with a captured exit code aggregation (the justfile lives long enough to show both reports; the aggregate exit is max of the two).
- `test-engine` — delegates to `just engine::test && just tests::test-engine`.
- `test-rpc` — delegates to `just rpc::test-all && just tests::test-rpc`.
- `test` — `test-db && test-engine && test-rpc && tests::test-e2e`.
- `test-triangle` — NEW. Runs all three paths for all three services in a deterministic order, produces a single aggregated summary at the end. This is the "monitor" recipe.

### 3.6 Standards Matrix (updated)

| Concern | DB inner (Hurl) | Engine inner (cargo) | RPC inner (Go + grpcurl) | Outer (tests/) |
|---|---|---|---|---|
| Assertion style | `[Asserts]` with `jsonpath` | `assert_eq!` / `assert_matches!` | `testing.T.Fatal` / shell `[[ ]]` | `expect(...).to...` |
| Error type | HTTP status + status field | Rust `Result` + `thiserror` | Go `error` / shell exit code | Vitest `expect` |
| Retry for eventual consistency | `[Options] retry:` | n/a (Rust tests don't cross the wire) | custom sleep loops | custom `await delay` (today) |
| Parallelism | One Hurl invocation per file (default `--jobs 1` for safety) | `cargo test` default parallelism | `go test -parallel` | `vp test` default |
| Reports | `--report-html` on demand | `cargo test` stdout | stdout with aggregated summary | Vitest default reporter |

### 3.7 What MUST NOT be introduced

- **No test-only endpoints** on the engine or sidecar (e.g., `/test/dispatch-history`). If a wire can't be observed through the public contract + logs, the contract is insufficient — discuss in §9, don't paper over.
- **No mocks at the service boundary.** Outer-ring tests always hit real services (gated by `skipIf`). Mocks are reserved for Rust `#[cfg(test)]` blocks that need to isolate a repo from Surreal, which is inner-ring concern.
- **No dynamic fixture generation** (factories, "faker" libraries). Tests that need data either use seed data (deterministic) or mint records inline with explicit field values.
- **No global `beforeAll` that mutates shared state.** Per-test setup only.
- **No test-runner-level configuration for skipping** (e.g., Vitest `--exclude` patterns for "flaky" tests). Flakes are regressions; fix or mark.

---

## 4. Component Map & Directory Structure

### 4.1 Updated tree (diffs only from prior spec)

```
src/server/
├── server.just                           # unchanged from prior Phase 0 + new test-triangle recipe
│
├── db/
│   ├── db.just                           # + test, test-one, test-report recipes
│   ├── db.Dockerfile
│   ├── docker-compose.yml
│   ├── init/                             # unchanged
│   ├── scripts/                          # unchanged
│   └── tests/                            # NEW — Hurl inner ring
│       ├── .env                          # NEW — hurl variables (NS, DB, base URL)
│       ├── _health.hurl                  # NEW — reusable health-check snippet
│       ├── schema-email.hurl             # NEW
│       ├── schema-role.hurl              # NEW
│       ├── schema-status.hurl            # NEW
│       ├── schema-rating.hurl            # NEW
│       ├── unique-email.hurl             # NEW
│       ├── unique-slug.hurl              # NEW
│       ├── event-comment-creates-activity.hurl    # NEW
│       ├── event-like-creates-activity.hurl       # NEW
│       ├── computed-item-stats.hurl      # NEW
│       ├── fn-search-items.hurl          # NEW
│       ├── fn-popular-items.hurl         # NEW
│       ├── fn-items-near.hurl            # NEW
│       ├── graph-forward-reverse.hurl    # NEW
│       ├── graph-recommendations.hurl    # NEW
│       └── reference-cascade-delete.hurl # NEW
│
├── engine/
│   ├── engine.just                       # unchanged structurally
│   ├── Cargo.toml
│   └── [crate tree unchanged]
│   # cargo tests remain co-located under #[cfg(test)] modules; no structural change
│
├── rpc/
│   ├── rpc.just                          # + test, test-smoke, test-all recipes
│   ├── go.mod
│   ├── cmd/
│   ├── internal/
│   │   └── ...
│   │       └── *_test.go                 # NEW — unit tests, table-driven
│   └── tests/                            # NEW — live-server smoke
│       ├── README.md                     # NEW — how to run, what it covers
│       ├── grpcurl.sh                    # NEW — main smoke script
│       └── bin/
│           └── mint-token/               # NEW — small Go cmd for JWT minting
│               └── main.go
│
├── proto/
│   ├── buf.gen.yaml                      # unchanged from Phase 2 (TS stubs enabled)
│   └── ...
│
└── tests/
    ├── tests.just                        # unchanged
    ├── package.json                      # unchanged structurally
    ├── vite.config.ts                    # unchanged
    ├── globalSetup.ts                    # MODIFIED — owns preflight logic fully
    ├── globalTeardown.ts                 # (Phase E) — namespace drop
    ├── services.ts                       # unchanged
    ├── preflight.ts                      # DELETE
    ├── TODOS.md                          # NEW — tracked wire gaps (see §3.4)
    │
    ├── fixtures/                         # UNCHANGED — closure-based harness stays
    │   ├── api_env.ts
    │   ├── rpc_env.ts
    │   └── surreal_env.ts
    │
    ├── lib/
    │   ├── clients/
    │   │   ├── surreal.ts                # unchanged
    │   │   ├── engine.ts                 # unchanged
    │   │   └── rpc.ts                    # MODIFIED — createGrpcTransport
    │   ├── probes.ts                     # unchanged
    │   ├── tokens.ts                     # MODIFIED — if not complete, finish JWT minter
    │   ├── cleanup.ts
    │   ├── naming.ts
    │   ├── errors.ts
    │   └── assert-db.ts
    │
    ├── unit/db/                          # unchanged
    ├── integration/
    │   ├── db/                           # unchanged
    │   ├── engine/                       # unchanged
    │   └── rpc/                          # unchanged
    └── e2e/
        └── smoke.test.ts                 # MODIFIED (Phase D) — cross-path validation
```

### 4.2 Component responsibilities (new/changed)

**`db/tests/*.hurl`** · Each file verifies one DB capability from outside any SDK. · Exposes: a set of assertions executable by `hurl --test`. · Consumes: a running SurrealDB at `:8000` + Basic auth. · MUST NOT: reference any Rust or Go or TS code; import from sibling test directories; assume seed data beyond what's documented in `db/init/05-seed/`.

**`db/tests/.env`** · Hurl variable file. · Exposes: `ns=template`, `db=main`, `base_url=http://localhost:8000`. · MUST NOT contain credentials (those go via `--user` on the CLI, sourced from shell env).

**`rpc/internal/**/*_test.go`** · Per-package unit tests for Go logic that doesn't cross the wire. · Exposes: testable functions via `go test`. · Consumes: the package's own types + test doubles. · MUST NOT: start a grpc.Server, open network sockets, or import `google.golang.org/grpc` beyond type references.

**`rpc/tests/grpcurl.sh`** · Live-server smoke test using grpcurl. · Exposes: bash-level pass/fail with a summary. · Consumes: a running sidecar at `:4000`, a callable `bin/mint-token`, `grpcurl` binary. · MUST NOT: assume the engine is also up; the sidecar MUST be independently testable thanks to local JWT minting.

**`rpc/tests/bin/mint-token/main.go`** · Tiny Go program that reads `JWT_SECRET` from env, emits a signed HS256 JWT to stdout. · Exposes: `mint-token [--claims key=value,...]` CLI. · Consumes: `os.Getenv("JWT_SECRET")`. · MUST NOT hardcode the secret; MUST fail loudly if it's missing.

**`tests/TODOS.md`** · Source of truth for every `it.fails` in the suite. · Exposes: markdown anchors linked from test `reason` strings. · Consumes: nothing; hand-edited. · MUST be updated in the same commit as the `it.fails` marker it documents.

**`tests/lib/clients/rpc.ts`** (modified) · The TS adapter for the RPC sidecar. · Exposes: `RpcClient` interface + `createRpcClient(config)` factory returning Connect-ts clients keyed by service. · Consumes: `@connectrpc/connect-node` (specifically `createGrpcTransport`), generated proto stubs. · MUST NOT: shell out to grpcurl; import from `createConnectTransport` or `createGrpcWebTransport` — the gRPC transport is the only permitted choice for this adapter.

### 4.3 What's being deleted

- `tests/preflight.ts` — redundant once `globalSetup.ts` owns the probe-and-banner responsibility. Delete in Phase A.
- `tests/lib/client.ts` (if the legacy aggregate still exists post-Phase 2) — specs MUST import from `lib/clients/<service>.ts` only.
- `tests/deno.json` — if nothing in `tests/` still uses Deno runtime APIs, the file is dead configuration. Audit in Phase A; delete if possible.

---

## 5. Trade-off Analysis

### 5.1 Connect-ts Transport

```
DECISION: Which Connect-ts transport the RPC adapter uses.
OPTIONS CONSIDERED:
  A. createConnectTransport — speaks Connect protocol (HTTP/1.1 or HTTP/2 + JSON
     or protobuf). Current (broken) choice.
     Pros: widest HTTP infrastructure compatibility; JSON payloads are debuggable.
     Cons: requires the server to speak Connect. Stock grpc-go does not.
     Result: ECONNRESET from grpc-go servers. Observed in today's run.
  B. createGrpcTransport — speaks raw gRPC over HTTP/2 with protobuf.
     Pros: works against unmodified grpc-go; matches grpcurl's semantics;
     supports streaming; binary payloads match production traffic.
     Cons: requires HTTP/2 (client-side Node http2 module); binary payloads
     less debuggable from curl/logs without a proto schema.
  C. createGrpcWebTransport — speaks gRPC-Web (HTTP/1.1 with special framing).
     Pros: browser-compatible.
     Cons: requires a translating proxy (Envoy, connect-go gateway) that the
     stack does not have. Server would reject as 415.
CHOSEN: B — createGrpcTransport.
REASON: The Go sidecar is vanilla grpc-go. The test transport must match.
  Connect-ts's gRPC transport is explicitly documented as working with
  grpc-go, grpcurl, and any gRPC client without special server configuration.
  This exactly mirrors what grpcurl does on the command line, preserving
  triangulation — if Connect-ts fails where grpcurl succeeds, the TS
  adapter is at fault; if both fail, the server is at fault.
REVISIT IF: The sidecar is migrated to connect-go and gains native Connect
  protocol support, at which point B still works but A becomes available
  with its debugging benefits.
```

### 5.2 DB Inner Ring — Hurl vs cURL-in-bash vs embedded-TS

```
DECISION: How the DB inner ring exercises the /sql endpoint.
OPTIONS CONSIDERED:
  A. Hurl files + hurl --test.
     Pros: declarative; jsonpath assertions built in; [Captures] and
     [Options] retry: handle sequencing and eventual consistency; HTML
     reports; native CI output; the syntax reads as specification.
     Cons: one more tool in the toolchain (requires Nix addition); less
     programmability than a general-purpose test framework.
  B. Bash + curl + jq assertions.
     Pros: zero new tools; ubiquitous.
     Cons: assertions become brittle shell gymnastics; no built-in retry
     primitive for eventual consistency; no structured report; CI output
     is just logs.
  C. Embed these tests in tests/integration/db/ with a fetch-based client.
     Pros: no new tool.
     Cons: defeats the whole purpose — the point of the DB inner ring is
     to verify the DB contract WITHOUT the TS SDK, so when the SDK breaks
     the DB tests don't also break. Using fetch from TS keeps us in TS-land
     but still uses different machinery than the SDK, which is partial
     triangulation. Acceptable second choice if Hurl is hard to add.
CHOSEN: A — Hurl.
REASON: Hurl was purpose-built for this shape of testing. The file format
  reads as a specification, not as code — aligning with the "tests as
  executable documentation" goal. [Options] retry: is the single cleanest
  solution to SurrealDB's event-driven eventual consistency, replacing
  imperative setTimeout patterns. HTML reports are a real UX win when
  debugging a red run.
REVISIT IF: Hurl becomes unavailable in the Nix shell for a platform the
  project cares about (extremely unlikely — it's a single static binary).
```

### 5.3 Go Inner Ring Split (unit vs smoke)

```
DECISION: How the Go sidecar's inner-ring tests split between unit and live.
OPTIONS CONSIDERED:
  A. Only go test. Mock the grpc.Server in unit tests if live coverage needed.
     Pros: one tool.
     Cons: mocking grpc.Server at the unit level is fragile and tests the
     mock more than the server; misses transport-level bugs entirely.
  B. Only live smoke (grpcurl or similar against a running process).
     Pros: tests the real thing.
     Cons: slow; requires server to be up for every test run; can't exercise
     pure-logic cases (JWT expiry, claim parsing) cheaply.
  C. Both: go test for pure logic; grpcurl script for live smoke.
     Pros: each tool covers what it's best at; fast unit tests for most
     of the surface; live smoke proves server is routing correctly.
     Cons: two invocations in CI.
CHOSEN: C.
REASON: The failure modes of an interceptor (JWT parsing) and of a server
  (routing, lifecycle) are fundamentally different and deserve different
  tools. Unit tests are fast and hermetic; grpcurl smoke is slow but
  realistic. The two-invocation cost is trivial.
REVISIT IF: The sidecar grows streaming RPCs, at which point grpcurl's
  streaming support needs verification; it may warrant adding a third
  path (a small Go integration-test binary that opens streams).
```

### 5.4 Known-Wire-Bug Marker

```
DECISION: How to represent a test that documents a known-broken wire.
OPTIONS CONSIDERED:
  A. Leave the test red. Rely on developer memory + PR discipline.
     Pros: no marker infrastructure.
     Cons: red output becomes noise; real regressions hide; new contributors
     can't tell signal from noise.
  B. it.skip(...) with a comment.
     Pros: removes red.
     Cons: test silently passes when wire is fixed; no signal that it's
     time to remove the skip. Also: silently skipped tests are a classic
     source of coverage rot.
  C. it.fails(reason) with linked TODOS.md entry.
     Pros: inverted semantics — test is "green" while wire is broken,
     flips to "red" the moment the wire is fixed, signaling "time to
     remove the marker." TODOS.md provides the canonical tracking.
     Cons: slight conceptual load (new developers see "failing = expected,
     huh?"); requires discipline to keep TODOS.md in sync.
  D. Delete the test. Re-add when wire works.
     Pros: nothing red, nothing misleading.
     Cons: loses the encoded specification; loses the "catch me when I'm
     fixed" signal; in a TDD shop this is anti-pattern.
CHOSEN: C — it.fails + TODOS.md.
REASON: The marker's inverted semantics are precisely the TDD property the
  user asked for: the test encodes the expected behavior right now, and
  the runner flips color the moment the implementation catches up. No
  standup meeting needed to notice. TODOS.md makes the tracking
  discoverable; the reason-string-to-anchor convention keeps them linked.
REVISIT IF: The team finds the inverted semantics more confusing than
  helpful in practice — at which point option B plus a small custom
  reporter annotation becomes viable.
```

### 5.5 Engine Second Path

```
DECISION: Whether the engine gets a second independent path (analogous to
  Hurl for DB or grpcurl for RPC).
OPTIONS CONSIDERED:
  A. Hurl against /graphql endpoint.
     Pros: symmetric to the DB path; declarative.
     Cons: GraphQL error handling is inside the JSON body, not HTTP status;
     asserting on it is Hurl-awkward; the TS GraphQL client is already a
     thin wrapper over fetch and doesn't add much abstraction to verify.
  B. cargo test against a test-harness binary that boots the engine with
     an in-memory Surreal and hits it via hyper.
     Pros: deep integration coverage.
     Cons: in-memory Surreal may behave differently from containerized
     Surreal; significant new code; not required for triangulation because
     the engine's correctness is already triangulated via DB inner ring
     + TS outer ring (if DB is green and engine is red, the engine is at
     fault).
  C. No second path for the engine; rely on DB inner + engine outer
     triangulation.
     Pros: no new machinery; the existing two paths already localize faults
     at the resolution we need ("the engine is broken").
     Cons: can't distinguish an engine resolver bug from an adapter bug at
     test time.
CHOSEN: C — no second path for now.
REASON: The DB inner + engine outer pair already triangulates well enough
  to say "the engine has a bug" (today's comment_count failure is a clean
  example: DB inner passes, engine outer fails, so the engine is at fault).
  Finer localization within the engine is cargo test's job, and cargo
  tests ship with the engine — they ARE the inner ring for engine. Adding
  Hurl-against-GraphQL duplicates the TS outer path without adding localization.
REVISIT IF: cargo tests for the engine are not comprehensive (today they
  barely exist), at which point the right answer is to build them rather
  than add a second HTTP path.
```

### 5.6 Per-Service Recipe Aggregation

```
DECISION: Whether the root test-<peer> recipe should stop at first failure
  or aggregate.
OPTIONS CONSIDERED:
  A. just db::test && just tests::test-db — stops at first failure.
     Pros: simple; clean exit codes.
     Cons: loses triangulation signal — if Hurl fails, you never see what
     the SDK-path report says about the same capabilities.
  B. Aggregate: both ALWAYS run, max exit code is returned.
     Pros: you always see both reports, which is the whole triangulation
     point.
     Cons: slightly more complex recipe; exit code aggregation needs care.
CHOSEN: B.
REASON: Triangulation's value is in seeing the pattern across paths. A
  pipeline that bails at the first failing path cannot show the pattern.
  The complexity is ~3 extra lines per recipe, trivial.
REVISIT IF: CI billing cares about shaving seconds. Then introduce a
  `--fail-fast` flag that developers opt into.
```

### 5.7 Preflight Deletion

```
DECISION: When to delete tests/preflight.ts.
OPTIONS CONSIDERED:
  A. Delete in Phase A (now).
  B. Keep it around as a deno-runnable standalone probe for developers
     who want to check health without running tests.
CHOSEN: A — delete.
REASON: globalSetup performs the identical probe-and-banner on every
  `vp test` invocation, so "check if services are up" is satisfied by
  `just tests::test` itself (it prints the banner, then runs or skips).
  A single-purpose script that duplicates that is rot.
REVISIT IF: A developer workflow emerges that specifically needs a
  sub-second health check without test startup — build a new, tiny
  `just status` recipe then.
```

### 5.8 Per-Run Namespace

```
DECISION: Whether to stamp a per-run Surreal namespace in globalSetup.
OPTIONS CONSIDERED:
  A. Stamp per-run now (Phase E).
  B. Keep template:main for all runs; accept cross-run state leakage.
CHOSEN: A — stamp per-run, but only as part of Phase E, not earlier.
REASON: Triangulation (Phases B/C/D) is the immediate priority and does
  not require isolation. But parallel test execution (Vitest's default)
  + Hurl's own parallelism + grpcurl smoke all writing to template:main
  is a flakiness generator waiting to activate. Designing namespace
  stamping in Phase E ships that correctness with minimal upheaval
  because Phases A–D have been deliberately built around the matrix's
  `services.namespace` field (even though today it resolves to the
  static string "template").
REVISIT IF: Phase D exposes flakes earlier — accelerate Phase E in that
  case.
```

---

## 6. Phased Implementation Plan

Each phase closes on an **executable exit command** that MUST return 0 from a cold start (`just down && just run`, wait for banner ✓✓✓, then run the command). A phase is not complete until the command returns 0 **twice in a row**, ruling out first-time-cache effects.

### Phase A — Close Phase 2

**Goal.** The existing test suite runs with exactly one failure, and that failure is a **tracked** `it.fails` marker, not a harness bug.

**Deliverables.**
1. `tests/lib/clients/rpc.ts` uses `createGrpcTransport` from `@connectrpc/connect-node`. The `createConnectTransport` import is deleted.
2. `tests/integration/rpc/*.test.ts` — both specs pass against the running sidecar. If the Go handler returns an error for any other reason, that becomes a new `it.fails` + TODOS entry.
3. `tests/integration/engine/items.test.ts` — the `creates and deletes an item` test is marked `it.fails("expected to fail until engine sets comment_count=0 on create — see TODOS.md#engine-create-comment-count")`.
4. `tests/TODOS.md` — created, contains the `engine-create-comment-count` entry describing the bug (`Couldn't coerce value for field \`comment_count\` ... Expected \`int\` but found \`NULL\``), the suspected fix location (engine's item CREATE path), and the decision on whether to fix via engine code or via a `DEFAULT 0` in the Surreal schema (flagged as §9 open question).
5. `tests/preflight.ts` — deleted.
6. `tests/lib/tokens.ts` — exports a `mintToken(claims?)` function reading `JWT_SECRET` from env (loaded by globalSetup) and returning a signed HS256 JWT. Used by every `integration/rpc/*` spec; the grpcurl smoke helper in Phase C will mirror this logic.
7. Harness `withApiEnv` / `withRpcEnv` — update to use `lib/tokens.ts` for RPC auth (removing the current dependency on a live Engine for RPC tests).

**Constraints.**
- Any spec that still calls `createConnectTransport` fails lint? — no lint. Fails by **grep**: the exit command below includes a grep check.
- No new `it.skip` is introduced in this phase.
- No test is deleted; one becomes `it.fails`, that's it.
- The banner output format MUST be preserved exactly as it renders today.

**Exit command.**
```bash
cd src/server && \
  ! grep -rn 'createConnectTransport\|Deno\.Command\|grpcurl' tests/ --include='*.ts' && \
  ! test -f tests/preflight.ts && \
  just tests::test 2>&1 | tee /tmp/out.log && \
  grep -E 'Tests +1 (failed|todo).*(23|24) passed' /tmp/out.log
```

(The last grep confirms the expected state: 1 `it.fails` marker + all others passing. Adjust the count if the current suite has grown.)

**Risk flags.**
- **[LOW]** `@connectrpc/connect-node` pulls in Node's http2 module via automatic runtime detection. Under Bun, this works; under deep-Node-vendor environments it may need an explicit `httpVersion: "2"` option. Add if ECONNRESET recurs after the transport swap.
- **[LOW]** `jose` or equivalent JWT library versioning. Pin exactly.

### Phase B — DB Hurl Inner Ring

**Goal.** Every capability currently tested by `tests/unit/db/*` and `tests/integration/db/*` has a parallel Hurl test hitting SurrealDB's `/sql` endpoint directly. Triangulation for the DB layer becomes real: an issue in the TS SDK adapter is now distinguishable from an issue in the DB itself.

**Deliverables.**
1. `db/tests/` directory with one `.hurl` file per capability (see §4.1 tree).
2. `db/tests/.env` with `ns=template`, `db=main`, `base_url=http://localhost:8000`.
3. `db/tests/_health.hurl` — reusable first-request health check snippet. Every test file's first request is a GET to `/health` asserting 200.
4. `db/db.just::test` recipe: invokes `hurl --test --variables-file tests/.env --user root:root tests/*.hurl`. Root credentials sourced from shell env (`SURREAL_USER`, `SURREAL_PASS`) with fallback to `root:root` for local dev.
5. `db/db.just::test-one FILE` — debug recipe to run one file with `--very-verbose`.
6. `db/db.just::test-report` — adds `--report-html db/tests/out/report/` for a browsable report.
7. Root `server.just::test-db` updated to run Hurl inner ring first, then TS outer ring, aggregating exit codes (non-short-circuiting).
8. README in `db/tests/README.md` documenting: how to run, what each file covers, how retry options are used for event-driven capabilities, how to interpret the HTML report.

**Capability coverage (strict parity with existing TS tests).**

| TS spec | Hurl counterpart | Notes |
|---|---|---|
| `unit/db/schema.test.ts` A1 (invalid email) | `schema-email.hurl` | asserts `status == "ERR"` in response array |
| `unit/db/schema.test.ts` A2 (invalid role) | `schema-role.hurl` | same pattern |
| `unit/db/schema.test.ts` A3 (invalid item status) | `schema-status.hurl` | |
| `unit/db/schema.test.ts` A4 (invalid rating) | `schema-rating.hurl` | exercises `RELATE` through `/sql` |
| `unit/db/schema.test.ts` A5 (valid user) | covered by the positive half of email/role files | no dedicated file |
| `unit/db/indexes.test.ts` B1 (duplicate email) | `unique-email.hurl` | two CREATE requests; second expects ERR |
| `unit/db/indexes.test.ts` B2 (duplicate slug) | `unique-slug.hurl` | |
| `integration/db/computed.test.ts` C1 | `computed-item-stats.hurl` | uses `[Options] retry: 5` to wait for event |
| `integration/db/events.test.ts` D1 (comment→activity) | `event-comment-creates-activity.hurl` | retry for eventual consistency |
| `integration/db/events.test.ts` D2 (like→activity) | `event-like-creates-activity.hurl` | |
| `integration/db/functions.test.ts` F1 (fn::search_items) | `fn-search-items.hurl` | |
| `integration/db/functions.test.ts` F2 (fn::popular_items) | `fn-popular-items.hurl` | |
| `integration/db/functions.test.ts` F3 (fn::items_near) | `fn-items-near.hurl` | geospatial via `/sql` |
| `integration/db/graph.test.ts` E1 (forward/reverse) | `graph-forward-reverse.hurl` | |
| `integration/db/graph.test.ts` E2 (recommendations) | `graph-recommendations.hurl` | |
| `integration/db/references.test.ts` G1 (cascade) | `reference-cascade-delete.hurl` | retry for cascade event |

**Constraints.**
- Each `.hurl` file MUST be self-contained: it creates its own test data with randomized suffixes, verifies, cleans up. No test depends on another's side effects.
- Every assertion that depends on a SurrealDB event firing MUST use `[Options] retry: N retry-interval: <ms>` rather than adding delay requests. Max `retry` is 10 (bounded to keep CI fast).
- Response shape: SurrealDB `/sql` returns an array of `{status, result, time}` objects, one per statement. Assertions use `jsonpath "$[*].status" not contains "ERR"` for positive cases, `jsonpath "$[?(@.status=='ERR')]" exists` for negative cases.
- Cleanup statements run in the same file (not a separate teardown), via a final `POST /sql` with a `DELETE` statement. Accept that a crashed Hurl run leaves stray records — acceptable for local dev; Phase E's namespace stamping resolves permanently.
- No Hurl file exceeds 80 lines of actual request+assertion content. If it would, split it.

**Exit command.**
```bash
cd src/server && \
  just db::run & sleep 3 && \
  test -d db/tests && test -f db/tests/.env && \
  just db::test && \
  just tests::test-db && \
  just test-db
```

(The three `test-db` variants: Hurl inner alone, TS outer alone, aggregated root recipe. All MUST return 0 when the DB is up and seed data is present.)

**Risk flags.**
- **[MEDIUM]** Eventual-consistency retry tuning. 100ms × 5 retries = 500ms worst case, fine for local; CI may need bumping if machines are slower. Document as a knob in `.env` (`retry_ms`, `retry_count`).
- **[MEDIUM]** SurrealDB 3.x's HTTP response shape has varied across minor versions — the `{database, namespace}` preamble objects may or may not be present depending on version. Hurl files MUST be defensive via wildcard jsonpath (`$[?(@.status)]`) rather than positional (`$[2]`).
- **[LOW]** Seed determinism. If seed data changes (e.g., new items added to `hiking_boots` fixture), positive-assertion Hurl files may need updates. Document the dependency in each file's header comment.

### Phase C — Go Inner Ring

**Goal.** The Go sidecar has its own test suite in two tiers: pure-logic unit tests via `go test`, and a live-server smoke test via `grpcurl`. A failure in the TS Connect-ts adapter can now be distinguished from a failure in the Go server itself.

**Deliverables.**
1. **Go unit tests** under `rpc/internal/**/*_test.go`:
   - `rpc/internal/middleware/interceptors_test.go` — table-driven tests for the JWT interceptor: valid token, expired token, missing bearer, malformed token, wrong algorithm, wrong signature, wrong audience.
   - `rpc/internal/service/notifier/service_test.go` — tests for queue enqueue, drain semantics, graceful shutdown timeout, channel-based dispatch semantics.
   - `rpc/internal/transport/grpc/*_handler_test.go` — unit tests for domain→status error mapping, request field validation, response shape.
   - Test doubles live in `rpc/internal/testfakes/` or inline — no external mocking library required.
2. **Live smoke** at `rpc/tests/grpcurl.sh`:
   - Calls `Health/Check` — expects `SERVING`.
   - Lists services via `grpcurl -plaintext localhost:4000 list` — expects `template.v1.NotifierService` and `template.v1.DocumentService` in output.
   - Calls `NotifierService/Dispatch` with a valid minted JWT and a test payload — expects success response.
   - Calls `NotifierService/Dispatch` with a bogus JWT — expects `Unauthenticated` code.
   - Calls `DocumentService/Generate` with a valid token — expects a job-id response.
   - Script prints a summary: `✓ <test name>` / `✗ <test name>: <error>`. Exits 0 iff all pass.
3. **`rpc/tests/bin/mint-token/main.go`** — tiny CLI. Reads `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE` from env, optionally accepts `--sub <user-id>` / `--exp <seconds-from-now>`. Emits the token to stdout.
4. **`rpc/rpc.just`** adds:
   - `test` — `go test ./...` (the unit tests).
   - `test-smoke` — invokes `bash tests/grpcurl.sh`.
   - `test-all` — `just rpc::test && just rpc::test-smoke`.
5. **Root `server.just::test-rpc`** updated to call `just rpc::test-all && just tests::test-rpc` with exit-code aggregation.

**Constraints.**
- Go unit tests MUST NOT open network sockets. If a test needs a grpc.Server, it uses `bufconn` — the in-memory grpc transport — not a real port.
- Go unit tests MUST run in parallel (`t.Parallel()` on every table-driven case).
- `grpcurl.sh` MUST use `set -euo pipefail` and explicit exit-code aggregation (it keeps running through failures to produce a complete report, then exits with the aggregate).
- `mint-token` binary is built once per `test-smoke` run via `go build -o tests/bin/mint-token ./tests/bin/mint-token`. The build is cached by `go build`.
- JWT secret MUST come from `.env` via shell-source, never hardcoded, never committed.
- The smoke script MUST be runnable standalone: `cd rpc && bash tests/grpcurl.sh` works when the sidecar is up, without justfile orchestration.

**Exit command.**
```bash
cd src/server && \
  just rpc::test && \
  just rpc::run & sleep 3 && \
  just rpc::test-smoke && \
  just rpc::test-all && \
  just tests::test-rpc && \
  just test-rpc
```

**Risk flags.**
- **[MEDIUM]** `grpcurl` may not be in the Nix shell. Add to `flake.nix` if missing. Fallback: `nix shell nixpkgs#grpcurl --command bash tests/grpcurl.sh`.
- **[MEDIUM]** JWT claim shape must match exactly between `tests/lib/tokens.ts` (TS outer) and `rpc/tests/bin/mint-token` (Go inner smoke). A one-paragraph spec in `rpc/tests/README.md` documents the canonical claims: `sub`, `iss`, `aud`, `exp`, `iat`. Both minters produce identical tokens for identical inputs.
- **[LOW]** `bufconn` vs real server nuances for streaming. Current handlers are all unary, so this is not a blocker. Document as caveat when streaming is added.

### Phase D — Tri-Path Validation & E2E

**Goal.** Every wire in the system is validated through two or three independent paths. The root `test-triangle` recipe produces a single report whose color pattern localizes any fault.

**Deliverables.**
1. **Root `server.just::test-triangle`** — runs, in order:
   - `just db::test` (Hurl, DB path #1)
   - `just tests::test-db` (SDK, DB path #2)
   - `just engine::test` (cargo, engine path #1 — may be minimal until engine unit tests exist)
   - `just tests::test-engine` (GraphQL client, engine path #2)
   - `just rpc::test` (Go unit, RPC path #1)
   - `just rpc::test-smoke` (grpcurl, RPC path #2)
   - `just tests::test-rpc` (Connect-ts, RPC path #3)
   - `just tests::test-e2e` (cross-service)
   Each segment runs regardless of previous failures; final exit code is the max.
2. **`tests/e2e/smoke.test.ts`** rewritten for tri-path cross-checking:
   - Test 1: create an item via the Engine's GraphQL `createItem` mutation. Immediately verify the item exists via: (a) the `surrealdb` SDK, (b) a direct fetch to `/sql` within the test. Two independent DB reads of the same write.
   - Test 2: create a comment via the Engine. Verify the `activity` record via the SDK. Assert the activity's `target_item` matches the item's ID.
   - Test 3: call `NotifierService/Dispatch` via Connect-ts. The test captures stdout/stderr of the sidecar if possible (stretch) OR simply asserts the response is successful. Note: without adding a test-only endpoint (which §3.7 forbids), "did the sidecar actually try to send the email?" can only be verified via the Hermes DebugProvider log line. This is documented as a limitation; the e2e confirms the call round-trips but not the side effect.
3. **`tests/e2e/failure-localization.test.ts`** (NEW) — a set of `it.todo` placeholders that describe scenarios for future implementation. These are not yet enforced; they're the specification of how future regressions should be localized.

**Constraints.**
- `test-triangle` output MUST end with a summary block enumerating each segment's result. Format: one line per segment, with path indicator (`[HURL]`, `[SDK]`, `[GQL]`, `[GO]`, `[GRPCURL]`, `[CONNECT-TS]`, `[E2E]`) and a tick/cross. This is the monitor surface.
- E2E tests MUST NOT depend on sidecar-side logging for primary assertions. Logs are observational, not normative.
- No e2e test MAY introduce new GraphQL mutations or new sidecar handlers; it consumes what Phases A–C exposed.

**Exit command.**
```bash
cd src/server && \
  just down && just run & sleep 5 && \
  just test-triangle 2>&1 | tee /tmp/triangle.log && \
  grep -E '\[(HURL|SDK|GQL|GO|GRPCURL|CONNECT-TS|E2E)\].*✓' /tmp/triangle.log | wc -l | \
    xargs -I {} test {} -ge 7
```

(The last grep checks that at least 7 of the 8 segments show a `✓` in the summary; accounts for the engine `it.fails` path showing as expected-failure, not success.)

**Risk flags.**
- **[HIGH]** E2E tests are by nature the flakiest layer (timing, state, multiple services). Strict per-run namespace (Phase E) dramatically reduces flakiness. Without it, run E2E serially (Vitest `--no-threads` for `e2e/`).
- **[MEDIUM]** "Did the sidecar side effect happen?" is fundamentally unobservable through the public contract today (no log-scraping endpoint, no OTLP). This is an acknowledged e2e gap, documented rather than silently accepted.
- **[LOW]** Summary format parsing. The grep in the exit command is a placeholder; if `test-triangle` produces structured output (JSON), switch to `jq`-based verification.

### Phase E — Observability & Isolation (post-triangle)

**Goal.** Suite runs are idempotent, parallel-safe, and each run leaves no state behind. Request-ID correlation makes multi-service debugging tractable. TODOS.md count equals `it.fails` count.

**Deliverables.**
1. **Per-run namespace stamping.**
   - `tests/globalSetup.ts` generates a run ID (`template_test_<timestamp>_<random>`) and stamps a Surreal namespace under that name.
   - Seed scripts (`db/init/05-seed/*.surql`) are parameterized: they read the target NS from an env var (`SURREAL_NS_OVERRIDE`) or default to `template`.
   - globalSetup runs the seeds into the stamped namespace via the SurrealDB HTTP `/sql` endpoint with `Surreal-NS: <stamped>`.
   - `services.namespace` field in the matrix holds the stamped name.
   - `globalTeardown.ts` runs `REMOVE NAMESPACE <stamped>` at suite end.
   - All fixtures default to `services.namespace`. No spec hardcodes `"template"`.
2. **Request-ID propagation.**
   - Engine emits an `x-request-id` header on every GraphQL response (Rust `tower` layer). Incoming requests MAY provide one; if absent, the engine generates a UUIDv7.
   - When the engine calls the sidecar, the request-id is forwarded as gRPC metadata `x-request-id`.
   - Both services log the `request_id` field on every span.
   - Selected e2e tests capture the `x-request-id` from the initial GraphQL response and pass it through via fixture headers, asserting correlation in downstream responses.
3. **TODOS.md audit.**
   - A simple shell loop (`scripts/audit-todos.sh`) counts `it.fails(` occurrences across `tests/` and `##` top-level anchors in `tests/TODOS.md`. They MUST match.
   - Run from `just quality` (recipe aggregation).
4. **Documentation.**
   - `tests/README.md` explains: the three-ring model, the tri-path model, how to run everything, how to read triangle output, how to add a new test file, the TDD marker discipline.
   - `db/tests/README.md` explains the Hurl layer specifically.
   - `rpc/tests/README.md` explains the Go inner ring and grpcurl smoke.

**Constraints.**
- No spec may contain the literal string `"template"` except `globalSetup.ts` which owns the default. Hurl files use `{{ns}}` variable from `db/tests/.env`.
- Parallel execution (`vp test run --pool threads`) MUST produce identical results to serial execution.
- `just test-triangle` MUST return 0 twice in a row from clean state (idempotency).
- `tests/TODOS.md` anchors MUST match `it.fails` reason-strings exactly (same slug).

**Exit command.**
```bash
cd src/server && \
  just down && just run & sleep 5 && \
  just test-triangle && \
  just test-triangle && \
  bash scripts/audit-todos.sh
```

**Risk flags.**
- **[HIGH]** Namespace parameterization in seed scripts touches production dev UX (`just db::run` seeds). Gate with env var defaulting to `template`, override only in test context. Bad migration here breaks `just run`.
- **[MEDIUM]** Request-ID header propagation in tonic and axum requires middleware config in both. Non-trivial; scope a small spike before committing.
- **[LOW]** TODOS audit script is a simple grep-and-count. False positives possible (e.g., `it.fails(` in a comment). Use a regex anchored to line start.

---

## 7. Implementation Management

### 7.1 Sequencing

```
Phase A (close Phase 2)  ──▶  Phase B (Hurl DB)   ──┐
                          │                         ├─▶ Phase D (tri-path + e2e)  ──▶  Phase E (isolation + obs)
                          └─▶  Phase C (Go inner)  ─┘
```

- Phase A is prerequisite to everything else (closes transport + establishes TDD markers).
- Phases B and C are **parallelizable** — they touch disjoint directories (`db/tests/` and `rpc/tests/` + `rpc/internal/`).
- Phase D consumes both; cannot start until B and C are both green.
- Phase E is orthogonal correctness/observability; postponeable if deadline pressure appears.

### 7.2 Critical path

**A → (B ‖ C) → D.** Phase E is post-MVP.

### 7.3 Integration points (high-coordination)

1. **JWT claim shape.** `tests/lib/tokens.ts` (TS) and `rpc/tests/bin/mint-token/main.go` (Go) MUST mint identical tokens for identical inputs. Single spec documented in `rpc/tests/README.md`: `sub` = user ID (e.g., `user:alice`), `iss` = `template-engine`, `aud` = `template-rpc`, `exp` = now + 3600s, `iat` = now, HS256 signed with `JWT_SECRET`. Drift here breaks triangulation silently.
2. **Seed data IDs.** Hurl tests reference `user:alice`, `user:bob`, `item:hiking_boots` by literal ID. The DB seed scripts MUST keep these stable. When adding/renaming a seed, grep `db/tests/*.hurl` for the old ID before merging.
3. **Namespace parameterization (Phase E).** The env-var override mechanism for seed scripts is a new operational concept. Document prominently; `just run` (dev shell) and `just test` (stamped) must both work.
4. **Proto-generated TS stubs.** Phase 2 enabled TS emit via `buf generate`. Phase C's grpcurl smoke uses `grpcurl`'s reflection; the TS outer path uses the stubs. Both must stay current; `just rpc::generate` MUST be re-run after any `.proto` change.

### 7.4 Breaking changes

- **[HIGH]** Root `test-<peer>` recipes change semantics from short-circuit to aggregate in Phase D. A script that depended on stopping at first failure would break. Document in CHANGELOG (if any).
- **[HIGH]** Namespace override env var in Phase E changes seed invocation. Old direct `cat *.surql | surreal sql` incantations that ignore the env var will still seed `template`, not `template_test_<id>`. Document.
- **[MEDIUM]** `tests/preflight.ts` deletion in Phase A. If any CI job or dev script invokes it, that invocation breaks.
- **[MEDIUM]** `createConnectTransport` removal in Phase A. Any downstream code that depended on the Connect protocol wire format (unlikely in tests, but possible in an external script) breaks.

---

## 8. Validation & Testing Strategy

### 8.1 Layer × path matrix

| Service | Inner path | Outer path | E2E path |
|---|---|---|---|
| SurrealDB | Hurl `db/tests/*.hurl` | `surrealdb` SDK via `tests/{unit,integration}/db` | Multi-hop scenarios in `tests/e2e/smoke.test.ts` |
| Rust Engine | `cargo test` in engine workspace | GraphQL client via `tests/integration/engine` | Same |
| Go Sidecar | `go test` + `grpcurl.sh` | Connect-ts via `tests/integration/rpc` | Same |

Every cell above MUST exist and be green (or have a tracked `it.fails`) by end of Phase D. The matrix is the definition of done for "wire validation."

### 8.2 Local dev workflow

```
1. nix develop
2. just down && just run                  # cold boot the stack, wait for banner
3. just test-triangle                     # full triangulation run
4. Investigate reds:
   - [HURL] red + [SDK] green  →  DB SDK adapter bug
   - [HURL] red + [SDK] red     →  DB schema or seed
   - [GRPCURL] green + [CONNECT-TS] red  →  TS RPC adapter bug
   - [GO] red only              →  Go unit logic bug
   - [E2E] red alone            →  cross-service wiring
5. Fix; mark with it.fails if fix is deferred; update TODOS.md.
6. Re-run just test-triangle; confirm new state.
7. Commit.
```

### 8.3 Observability during suite runs

- **globalSetup banner** (existing) — ✓ / ✗ per service with URLs.
- **Hurl HTML report** (Phase B) — `just db::test-report` generates a browsable report under `db/tests/out/`.
- **grpcurl summary** (Phase C) — one line per call in `tests/grpcurl.sh` output.
- **Vitest reporter** (default) — per-test results with `it.fails` rendered as "expected failure" lines.
- **Triangle summary** (Phase D) — final block at end of `test-triangle` enumerating every segment's verdict.
- **Request-ID correlation** (Phase E) — cross-service log correlation for debugging a specific run.

### 8.4 What is NOT validated

Explicitly noted so nobody assumes coverage:

- **Sidecar side effects** (did an email actually get sent?). Hermes DebugProvider logs it; tests observe the log line at best, which is fragile. Not in scope.
- **GraphQL subscription round-trips.** No tests today; add when the engine exposes subscriptions.
- **Concurrent-modification semantics** of Surreal. Implicitly tested when parallel runs are added in Phase E; no dedicated stress tests.
- **TLS paths.** All local dev is plaintext. Production TLS configuration is out of scope.
- **Rate limiting / quota** behaviors. The sidecar has neither; if added, new tests are needed.
- **Performance budgets.** Hurl can assert `duration < N` and the Go smoke script can time calls, but no budget is enforced. Add when relevant.

---

## 9. Open Questions & Risks

### 9.1 Open questions (must be resolved in the indicated phase)

1. **`comment_count` fix location (Phase A).** Two paths: (a) engine sets `comment_count = 0` explicitly in the CREATE SQL; (b) Surreal schema declares `DEFINE FIELD comment_count ON item TYPE int DEFAULT 0`. Option (a) keeps the DB schema pure and makes the engine fully responsible for the invariant. Option (b) is a one-line DB change and shields every client (not just the engine) from the same class of bug. Recommendation: **(b)** — the invariant belongs to the data, not to one of several potential consumers. Decide and document in TODOS.md#engine-create-comment-count.
2. **Should `document-generation.hurl` / engine-GraphQL-via-Hurl exist (Phase B)?** Arguments against already given in §5.5; flag if the absence bites.
3. **Connect-ts transport under Bun specifically (Phase A).** Bun's http2 implementation has historically had gaps. If `createGrpcTransport` still fails after the swap, try explicit `httpVersion: "2"` and/or Node-mode fallback.
4. **Namespace parameterization strategy (Phase E).** Options: (a) env-var preprocessing via `envsubst` on seed files; (b) Surreal's `LET $ns = ...` inside the seed; (c) a small Deno/Go script that rewrites seed files per run. (a) is simplest but adds a tool; (b) may not be expressive enough for all DEFINE statements; (c) is most flexible. Recommendation: **(a)** for simplicity; elevate to (c) if limitations appear.
5. **Hermes DebugProvider log-scraping for e2e (Phase D).** Is it worth capturing stdout/stderr of the sidecar subprocess during e2e runs to assert side effects? Recommendation: **no** — too fragile; accept the e2e gap and document it.
6. **Engine `cargo test` coverage (Phase D prerequisite).** The engine inner ring is currently empty per the tree. This plan does not mandate filling it, but `[ENGINE-INNER]` being empty means triangulation for engine has two paths instead of three. Decide whether to backfill `cargo test` as a prerequisite to Phase D or accept the lower coverage and move on. Recommendation: **accept for now**; add `cargo test` coverage in a parallel workstream.
7. **`grpcurl` availability across environments (Phase C).** Confirmed in Nix; verify in CI if a pipeline is added.

### 9.2 Risks

- **[HIGH]** Phase E's namespace parameterization touches shared seed scripts. A bad migration breaks `just db::run` for everyone. Mitigation: env-var default to `template`; opt-in via `SURREAL_NS_OVERRIDE` only in test contexts.
- **[HIGH]** Triangulation adds three distinct invocation surfaces (Hurl, go test, grpcurl) plus the existing vp test. Each has its own toolchain dependency. Mitigation: all tools pinned in `flake.nix`; document the `nix develop` prerequisite prominently; test-recipes fail loudly if a tool is absent.
- **[MEDIUM]** TDD marker discipline (`it.fails` + TODOS.md) depends on human diligence. Mitigation: Phase E's `audit-todos.sh` catches drift between markers and documentation.
- **[MEDIUM]** JWT parity between TS and Go minters. A one-character drift in claim names silently breaks every RPC test. Mitigation: shared `.env` for secrets; documented canonical claim spec; a small contract test (added in Phase C) that has both minters produce a token and asserts bytewise equality for identical inputs.
- **[MEDIUM]** Hurl retry timing in slow CI. Defaults (`retry: 5, retry-interval: 100ms`) may be tight. Mitigation: parameterize via `db/tests/.env` (`retry_count`, `retry_ms`); allow CI to override.
- **[LOW]** `@connectrpc/connect-node` minor version changes can rename transport options. Mitigation: pin exactly; read the changelog on upgrade.
- **[LOW]** Hurl HTML report path conflicts with `db/scripts/` outputs. Mitigation: use `db/tests/out/` as the dedicated artifact directory; gitignore it.

---

## Appendix A — Strict Rules (reference)

The following rules appear inline throughout this document. They are collected here for ease of reference. Violation of any is a specification failure.

1. `tests/lib/clients/rpc.ts` SHALL use `createGrpcTransport` from `@connectrpc/connect-node`. `createConnectTransport` and `createGrpcWebTransport` MUST NOT be imported.
2. `tests/preflight.ts` MUST be deleted. Probe logic lives only in `tests/globalSetup.ts`.
3. Every red test in `tests/**/*.test.ts` MUST be either a regression (to be fixed immediately) or marked `it.fails(reason)` with a matching entry in `tests/TODOS.md`.
4. Every `it.fails` `reason` string MUST begin with `"expected to fail until "` and MUST end with ` — see TODOS.md#<anchor>`.
5. Every top-level `describe` MUST be gated with `describe.skipIf(!services.<tag>, "<reason>")`. No bare `describe` at the top level of any spec.
6. No spec MAY construct a transport, call a probe, or import directly from `lib/clients/**`. Adapters are acquired through fixtures (`fixtures/*.ts`).
7. `db/tests/*.hurl` files MUST hit `http://localhost:8000/sql` directly; no SDK, no proxy.
8. Every Hurl file MUST begin with a health-check request to `/health` asserting `HTTP 200`.
9. Every Hurl assertion that depends on a SurrealDB event having fired MUST use `[Options] retry: N retry-interval: <ms>`. No manual delays.
10. No Hurl file MAY reference a fixed record ID for a record it CREATES — randomized suffixes only. Read-only references to seed records (`user:alice` etc.) are permitted.
11. Go unit tests MUST NOT open network sockets. Use `bufconn` for in-process grpc testing.
12. `rpc/tests/grpcurl.sh` MUST run under `set -euo pipefail` and aggregate exit codes rather than short-circuiting.
13. JWT minter output from `tests/lib/tokens.ts` (TS) and `rpc/tests/bin/mint-token` (Go) MUST be bytewise identical for identical inputs.
14. Seed scripts MUST accept a namespace override via the `SURREAL_NS_OVERRIDE` env var (Phase E). Default is `template`.
15. No test-only endpoint SHALL be added to the engine or the sidecar. Observable contracts only.
16. No mock SHALL be introduced at a service boundary in outer-ring tests. Real services, gated by `skipIf`.
17. Root recipes `test-db`, `test-engine`, `test-rpc` MUST run both inner and outer rings with aggregated exit codes, not short-circuiting.
18. `just test-triangle` MUST produce a summary block with one line per segment tagged `[HURL]`, `[SDK]`, `[GQL]`, `[GO]`, `[GRPCURL]`, `[CONNECT-TS]`, `[E2E]`.
19. Phases close only when their exit command returns 0 **twice in a row** from a cold-boot state.
20. No code change to the engine or the sidecar is implied by this specification. If a wire bug surfaces, it gets an `it.fails` and a TODOS entry — the fix is scheduled separately.

---

## Appendix B — Path-Pattern Quick Reference (for a future fault-localization dashboard)

```
HURL   |  SDK  |  GQL  |  GO   | GRPC  | CONN-TS | E2E  →  Most likely culprit
──────────────────────────────────────────────────────────────────────────────
  ✘       ✘       ✘       -       -       -       ✘   →  DB schema / seed
  ✓       ✘       ✘       -       -       -       ✘   →  surrealdb SDK adapter (tests/lib/clients/surreal.ts)
  ✓       ✓       ✘       -       -       -       ✘   →  Engine resolver / GraphQL layer
  ✓       ✓       ✓       -       -       -       ✘   →  Engine domain/store (bug lives in engine internals)
  -       -       -       ✘       ✘       ✘       ✘   →  Sidecar lifecycle / startup / port
  -       -       -       ✓       ✘       ✘       ✘   →  Server handler code / routing
  -       -       -       ✓       ✓       ✘       ✘   →  TS Connect adapter (tests/lib/clients/rpc.ts)
  -       -       -       ✓       ✓       ✓       ✘   →  Cross-service wiring (JWT parity, URL config, timing)
  ✘       ✘       ✓       -       -       -       -   →  Suspicious — investigate (shouldn't happen)
  ✓       ✓       ✓       ✓       ✓       ✓       ✓   →  All green, ship it.
```

This table is the operational payoff of Phase D. Laminate it.

---

**End of specification. Ready for implementation. Start at Phase A — the single transport-string change in `tests/lib/clients/rpc.ts` turns three red tests into two passing + one `it.fails`, closing Phase 2 in roughly the time it takes to rerun `just tests::test` twice.**