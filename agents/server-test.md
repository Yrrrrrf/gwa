# Template Server — Unified Test Suite Spec

**Spec Version**: 1.0
**Date**: 2026-04-15
**Status**: Ready for execution
**Reference**: `src/server/` — the working server stack this suite tests. Aether (`docs/lab/code/typescript/aether`) is the structural reference for the `withTestEnv` pattern and test organization.

---

## 0. Executive Summary

This plan builds a unified, stack-agnostic test suite for the template server. The suite lives at `src/server/tests/` as an independent Deno/TypeScript project that treats the entire server stack — SurrealDB, Rust GraphQL engine, Go gRPC sidecar — as three HTTP/RPC targets to drive from the outside. It is **not** a testing library, not a framework, and not coupled to any of the three services' implementation languages. It is a black-box test harness that proves the server works end-to-end.

The architecture is directly ported from the proven `withTestEnv` pattern in Aether: each test file is clean, declarative, and receives a fully configured context (client + credentials + cleanup hook) from a fixture wrapper. All infrastructure noise — auth bootstrapping, DB seeding, teardown — lives in fixture files, never in test files. The suite covers four concern layers (unit, integration, e2e, security) across three service targets, orchestrated by a single `just test` command. This is a long-term bet because the test suite outlives any individual service — when SurrealDB is swapped or the Rust engine is rewritten, the fixture layer absorbs the change while test files stay unchanged.

---

## 1. Context & Constraints

### Project Context
- **Existing monorepo** with a working server stack: SurrealDB 3 (schema, events, functions, graph, geo, full-text search), Rust engine (Axum 0.8 + async-graphql 8-rc + tonic 0.14), Go gRPC sidecar.
- **All three services are assumed working** — this plan does not build server features, only proves them.
- **Aether** (`@yrrrrrf/aether`) is a sibling Deno/TypeScript library in the same repo whose test organization (`withTestEnv`, `fixtures/`, `unit/`, `integration/`, `e2e/`, `security/`) is the direct structural reference.
- **The test suite IS its own project** — standalone `deno.json`, own deps, runnable independently of the server codebase.

### Goals — What "Done" Looks Like
1. `just test` runs the full suite against a live stack and reports pass/fail per group.
2. `just test db` / `just test api` / `just test rpc` runs only the relevant target.
3. Every SurrealDB feature (schema constraints, graph, events, functions, geo, full-text) has at least one test.
4. Every Rust GraphQL route (queries, mutations, subscriptions) has at least one test.
5. Every Go gRPC service method has at least one test.
6. Every test is order-independent — each one sets up and tears down its own state.
7. A developer who adds a new DB feature or GraphQL resolver knows exactly which file to add a test to.

### Team & Scale
- Solo developer. [ASSUMPTION]
- Template data volume: tens of seed records. Tests never generate millions of records.
- Single SurrealDB instance, single Rust engine process, single Go sidecar process.

### Architectural Rules
- **Aether patterns are canonical**: `withTestEnv` fixture wrapper, `fixtures/` owns all infrastructure, test files are declarative and clean.
- **No test framework beyond Deno built-ins**: `deno test` is the runner. No Jest, no Mocha, no separate test runner binary.
- **Vite + vite-plus for bundling/config**: Test runner configuration lives in `vite.config.ts` only — no separate vitest config file.
- **Three fixture environments, one lib**: `lib/` is shared infrastructure; `fixtures/` has one env file per service target.
- **Black-box only**: Tests call public APIs (HTTP/gRPC). No test imports Rust or Go source. No test reads DB internals except through the DB's own HTTP endpoint.
- **gRPC via Connect protocol**: [ASSUMPTION] The Go sidecar speaks Connect protocol. If it speaks raw gRPC, the client choice changes — see Trade-offs section.

### Out of Scope
- Unit tests for Rust domain logic (those live in `cargo test`).
- Unit tests for Go handler logic (those live in `go test`).
- Performance / load testing (k6 is the right tool if needed later — out of scope here).
- SvelteKit client tests.
- Mocking any service — all tests run against real, live instances.

### Assumptions
- [ASSUMPTION] The full stack is started before the test suite runs (via `just dev` or `just test-stack`).
- [ASSUMPTION] Seed data is loaded and available. Tests that need clean state manage their own setup/teardown via fixture hooks, not by reseeding the entire DB.
- [ASSUMPTION] A test user with known credentials exists in seed data (e.g., `user:alice` with a known password) for JWT bootstrapping.
- [ASSUMPTION] The Go sidecar speaks Connect protocol, making `@connectrpc/connect` the right gRPC client.
- [ASSUMPTION] `deno` is available in the Nix flake (alongside the existing `just`, `xh`, `curl`).

---

## 2. Architecture Overview

### The Three Targets

The test suite speaks three languages to three targets:

- **SurrealDB** via `POST http://localhost:8000/sql` — raw SurrealQL, `Basic` auth header, response is always HTTP 200 but body contains `"status":"ERR"` on failure. This is the quirk the DB client must handle.
- **Rust Engine** via `http://localhost:3000/graphql` — GraphQL over HTTP, JWT Bearer auth for mutations and subscriptions.
- **Go Sidecar** via Connect protocol at `http://localhost:4000` — typed RPC calls using `@connectrpc/connect`, JWT Bearer auth.

### System Diagram

```
  ┌──────────────────────────────────────────────┐
  │           src/server/tests/                   │
  │                                               │
  │  ┌──────────┐   ┌──────────┐  ┌───────────┐  │
  │  │  unit/   │   │integrat/ │  │   e2e/    │  │
  │  └────┬─────┘   └────┬─────┘  └─────┬─────┘  │
  │       │              │              │         │
  │  ┌────▼──────────────▼──────────────▼──────┐  │
  │  │            fixtures/                    │  │
  │  │  surreal_env.ts  api_env.ts  rpc_env.ts │  │
  │  └────┬──────────────┬──────────────┬──────┘  │
  │       │              │              │         │
  │  ┌────▼──────────────▼──────────────▼──────┐  │
  │  │                 lib/                    │  │
  │  │  client.ts    assert.ts    fixtures.ts  │  │
  │  └────┬──────────────┬──────────────┬──────┘  │
  └───────┼──────────────┼──────────────┼─────────┘
          │              │              │
  ┌───────▼──┐    ┌──────▼──────┐ ┌────▼──────┐
  │ SurrealDB│    │ Rust Engine │ │Go Sidecar │
  │ :8000    │    │ :3000       │ │:4000      │
  └──────────┘    └─────────────┘ └───────────┘
```

### Core Domain vs. Supporting

- **Core test targets**: DB (schema + graph + functions), API (GraphQL queries + mutations), RPC (service methods).
- **Supporting infrastructure**: lib/ (shared fetch wrappers, assertion helpers, token caching), fixtures/ (env setup/teardown), security/ (cross-cutting auth and injection tests).

---

## 3. Design Patterns & Code Standards

### 3.1 The `withEnv` Fixture Pattern (from Aether)

- **Pattern**: Test Fixture Wrapper (Context Injection)
- **Why**: The single biggest problem in integration test suites is infrastructure noise bleeding into test files — every test manually builds clients, seeds state, fetches tokens, and forgets to clean up. The `withEnv` pattern inverts this: infrastructure lives in the fixture, and test files only express intent. This is exactly what Aether's `withTestEnv` / `withSupabaseEnv` solves — and it works.
- **How**: Each fixture file exports a `withXxxEnv(name, fn)` function. Internally it: starts the appropriate client, obtains auth credentials, provides a typed context object to the test function, and runs teardown in a `finally` block regardless of test outcome. The test function receives `{ db, cleanup }` or `{ api, token, cleanup }` or `{ rpc, token, cleanup }` — exactly what it needs, nothing else.
- **Standards**: Fixture files are the ONLY place where client construction, token fetching, and cleanup logic lives. Test files MUST NOT call `fetch()` directly or manage their own tokens. Each test should take under 5 lines to express its core assertion.
- **At year 3**: When a new service target is added (e.g., a second Rust microservice), a new `env.ts` file is added to `fixtures/`. Zero test files change.
- **At year 5**: When the Go sidecar is replaced, only `rpc_env.ts` changes. The 40 tests that use it stay untouched.
- **At year 10**: The pattern is language-agnostic enough to port to a different runtime if Deno is ever replaced. The structural contract (fixture wraps test, context is injected, teardown is guaranteed) outlives any specific technology.

### 3.2 Three-Client Architecture

- **Pattern**: Adapter per Target (structural variation of Ports & Adapters)
- **Why**: Each of the three service targets speaks a different protocol with different auth patterns and different error conventions. SurrealDB returns `{"status":"ERR"}` in a 200. GraphQL returns `{"errors":[...]}` in a 200. Connect returns structured error types. A single generic fetch wrapper would need to handle all three divergently — that creates an unreadable blob. Three separate client adapters each know exactly one protocol.
- **How**: `lib/client.ts` exports three factory functions — `createSurrealClient(config)`, `createApiClient(config)`, `createRpcClient(config)`. Each returns a typed client object with methods appropriate to that target (e.g., `surreal.sql(query, vars)`, `api.query(gql, vars)`, `api.mutate(gql, vars)`, `rpc.notify(req)`, `rpc.generate(req)`). Error detection is baked in — callers never check HTTP status codes directly.
- **Standards**: Clients are created once per fixture context and shared across the test. No client is ever constructed inside a test body. All three clients accept a common `BaseConfig { baseUrl, token? }` shape so auth is configured uniformly.
- **At year 3**: Adding a new client (e.g., a WebSocket client for live query testing) is one new factory function in `lib/client.ts`, one new field in the fixture context. No ripple effect.

### 3.3 Assertion Layer

- **Pattern**: Domain-Specific Assertion Language (thin wrapper over `@std/assert`)
- **Why**: Raw `assertEquals` calls scattered across test files produce unreadable failure messages and don't communicate intent. `assertOk(label, response)` failing says "DB rejected the insert of invalid email" — not "expected 'OK' got 'ERR' at index 0". The DB's 200-with-error behavior makes this especially important: a raw equality check on `response.status === "OK"` is easy to get wrong or omit.
- **How**: `lib/assert.ts` exports five functions: `assertOk`, `assertError`, `assertContains`, `assertCount`, `assertEmpty`. Each wraps the underlying Deno assertion with a human-readable label and meaningful failure output. A shared pass/fail counter with `printSummary()` provides the final report.
- **Standards**: Every assertion MUST have a label string as its first argument. The label reads as a plain English statement of what should be true. Labels never use technical jargon — they describe user-observable behavior.
- **At year 3/5/10**: Assertion helpers are the most stable part of the suite. They are pure functions with no external dependencies. They will never need to change unless the team decides to change assertion philosophy.

### 3.4 Test Organization by Concern Layer

- **Pattern**: Concern-Layered Test Directory (from Aether)
- **Why**: Organizing tests by `unit/db/`, `integration/api/`, `e2e/`, `security/` rather than by feature means: a developer working on DB events knows to look in `integration/db/events.test.ts`, a developer adding a GraphQL resolver knows to add to `integration/api/`, a security audit starts in `security/`. The directory is the communication. Feature-based organization (`comments/`, `likes/`) couples test structure to domain and breaks as the domain evolves.
- **How**: Four top-level test directories. `unit/` tests isolated behavior with no cross-service calls (DB schema constraints, GraphQL input validation). `integration/` tests cross-layer behavior within a single service (DB events update stats, GraphQL mutations persist via store). `e2e/` tests full-stack flows across two or more services (create item via GraphQL → appears in DB → triggers recommendation fn). `security/` tests cross-cutting concerns (JWT required on mutations, SQL/GQL injection resistance, field-level permission enforcement).
- **Standards**: Each concern layer is runnable independently. No file in `unit/` may make calls that require another service to be running. No file in `integration/` may make calls across more than one service boundary. Only `e2e/` and `security/` may cross service boundaries.

### Cross-Cutting Standards

- **File naming**: `{feature}.test.ts` within concern directories. No `.spec.ts` — `.test.ts` is Deno convention.
- **Test names**: Emoji prefix signals the target: `🗄️` for DB, `🦀` for API, `🐹` for RPC, `🔐` for security. Makes scan output readable at a glance.
- **Cleanup**: Every fixture wrapper MUST run `cleanup()` in a `finally` block. Tests that create records must register a cleanup query on setup, not on teardown (so cleanup runs even if the test panics mid-way).
- **Token caching**: `lib/fixtures.ts` exports a `getToken()` utility that calls `POST /graphql` with a login mutation, caches the token for the test session, and exposes it. Never fetched inside a test body.
- **No global state**: Test files MUST NOT share mutable state at module level. Each `withEnv` call is isolated.

---

## 4. Component Map & Directory Structure

### 4.1 `lib/client.ts`
- **Responsibility**: Three typed fetch/RPC client factories — one per service target.
- **Location**: `src/server/tests/lib/client.ts`
- **Interfaces**: `createSurrealClient(config)` → `{ sql(query, vars) }`, `createApiClient(config)` → `{ query(gql, vars), mutate(gql, vars), subscribe(gql) }`, `createRpcClient(config)` → typed Connect client methods per proto service.
- **Dependencies**: `@connectrpc/connect` for the gRPC target, native `fetch` for the other two.
- **Must NOT**: Contain test logic, assertions, or fixture management. Must not know about test cleanup.

### 4.2 `lib/assert.ts`
- **Responsibility**: Domain-specific assertion helpers with human-readable labels and a shared pass/fail counter.
- **Location**: `src/server/tests/lib/assert.ts`
- **Interfaces**: `assertOk(label, response)`, `assertError(label, response)`, `assertContains(label, response, value)`, `assertCount(label, response, n)`, `assertEmpty(label, response)`, `printSummary()`.
- **Dependencies**: `@std/assert` from the Deno standard library.
- **Must NOT**: Make network calls. Must not import client.ts.

### 4.3 `lib/fixtures.ts`
- **Responsibility**: Shared seed/cleanup helpers and the JWT token cache.
- **Location**: `src/server/tests/lib/fixtures.ts`
- **Interfaces**: `getToken(apiClient)` → `Promise<string>` (cached), `withCleanup(client, teardownQuery)` → registers a cleanup to run after the test, `seedRecord(client, query)` → creates a record and auto-registers its deletion.
- **Dependencies**: `lib/client.ts` only.
- **Must NOT**: Export test wrappers (`withEnv` variants live in `fixtures/`, not here). Must not assert.

### 4.4 `fixtures/surreal_env.ts`
- **Responsibility**: `withSurrealEnv` wrapper — constructs the SurrealDB client, provides it to the test, and runs cleanup.
- **Location**: `src/server/tests/fixtures/surreal_env.ts`
- **Interfaces**: `withSurrealEnv(name, fn: ({ surreal, cleanup }) => Promise<void>)`.
- **Dependencies**: `lib/client.ts`, `lib/fixtures.ts`.
- **Must NOT**: Contain assertions. Must not know about GraphQL or RPC.

### 4.5 `fixtures/api_env.ts`
- **Responsibility**: `withApiEnv` wrapper — constructs the GraphQL client, fetches and caches a JWT, provides both to the test, runs cleanup.
- **Location**: `src/server/tests/fixtures/api_env.ts`
- **Interfaces**: `withApiEnv(name, fn: ({ api, token, cleanup }) => Promise<void>)`.
- **Dependencies**: `lib/client.ts`, `lib/fixtures.ts`.
- **Must NOT**: Contain assertions. Must not know about SurrealDB or RPC.

### 4.6 `fixtures/rpc_env.ts`
- **Responsibility**: `withRpcEnv` wrapper — constructs the Connect client, fetches and caches a JWT (shared with api_env cache), provides the typed RPC client to the test.
- **Location**: `src/server/tests/fixtures/rpc_env.ts`
- **Interfaces**: `withRpcEnv(name, fn: ({ rpc, token }) => Promise<void>)`.
- **Dependencies**: `lib/client.ts`, `lib/fixtures.ts`, generated proto/Connect types.
- **Must NOT**: Contain assertions. Must not talk to SurrealDB or GraphQL directly.

### 4.7 Test Files (by layer)

All test files follow the same contract: import `withXxxEnv` from the relevant fixture, import assertion helpers from `lib/assert.ts`, declare tests using the wrapper. Nothing else.

### Full Directory Tree

```
src/server/tests/
├── deno.json                         ← standalone Deno project, own imports, own tasks
├── vite.config.ts                    ← vite-plus config, test runner entry point
│
├── lib/
│   ├── client.ts                     ← three client factories (surreal, api, rpc)
│   ├── assert.ts                     ← assertOk, assertError, assertContains, assertCount, assertEmpty
│   └── fixtures.ts                   ← getToken(), withCleanup(), seedRecord()
│
├── fixtures/
│   ├── surreal_env.ts                ← withSurrealEnv()
│   ├── api_env.ts                    ← withApiEnv()
│   └── rpc_env.ts                    ← withRpcEnv()
│
├── unit/
│   ├── db/
│   │   ├── schema.test.ts            ← 🗄️ ASSERT violations: bad email, bad role, bad rating, dupe slug
│   │   └── indexes.test.ts           ← 🗄️ UNIQUE index violations: dupe user email, dupe tag slug
│   └── api/
│       └── validation.test.ts        ← 🦀 GraphQL input validation: missing required fields, wrong types
│
├── integration/
│   ├── db/
│   │   ├── computed.test.ts          ← 🗄️ Event-denormalized stats: comment → rating/count updated
│   │   ├── events.test.ts            ← 🗄️ on_comment_created → activity record written
│   │   ├── graph.test.ts             ← 🗄️ forward/reverse traversal, fn::user_recommendations
│   │   ├── functions.test.ts         ← 🗄️ fn::search_items, fn::popular_items, fn::items_near
│   │   └── references.test.ts        ← 🗄️ CASCADE (delete user → sessions gone), REJECT (tagged item blocks tag delete)
│   ├── api/
│   │   ├── auth.test.ts              ← 🦀 login mutation → token, bad credentials → error, logout
│   │   ├── items.test.ts             ← 🦀 listItems, getItem, createItem (auth), deleteItem (auth + 404)
│   │   ├── comments.test.ts          ← 🦀 addComment → item rating updates, listComments for item
│   │   ├── likes.test.ts             ← 🦀 toggleLike → like_count increments/decrements
│   │   └── search.test.ts            ← 🦀 searchItems returns results, recommendations returns non-empty
│   └── rpc/
│       ├── documents.test.ts         ← 🐹 generate document → pdf_base64 in response
│       └── notify.test.ts            ← 🐹 dispatch notification → success response
│
├── e2e/
│   ├── smoke.test.ts                 ← seed counts correct, full-text search works, geo radius works
│   ├── comment_flow.test.ts          ← GraphQL addComment → DB stats updated → live query fires
│   ├── recommendation_flow.test.ts   ← likes via API → fn::user_recommendations returns updated results
│   └── rpc_flow.test.ts              ← create item via API → trigger document generation via RPC
│
└── security/
    ├── auth_required.test.ts         ← 🔐 mutations without token → 401/UNAUTHORIZED
    ├── field_permissions.test.ts     ← 🔐 item.internal_notes not visible to non-admin
    ├── jwt_leakage.test.ts           ← 🔐 expired/tampered token rejected by both services
    └── injection.test.ts             ← 🔐 SurrealQL injection in search params, GQL injection resistance
```

---

## 5. Trade-off Analysis

### 5.1 Test Runner

```
DECISION: What test runner to use

OPTIONS CONSIDERED:
  A. Deno test (built-in) + vite-plus for bundling — Pros: zero extra deps,
     native to the runtime, vite-plus handles config elegantly from vite.config.ts.
     Aligns with Aether. Cons: less ecosystem tooling than vitest (e.g., coverage
     reporters are less mature).
  B. Vitest standalone — Pros: rich ecosystem, excellent coverage, UI mode.
     Cons: requires Node/npm, separate vitest.config.ts on top of vite.config.ts,
     diverges from Aether's proven pattern, adds a dependency.
  C. Hurl — Pros: zero code for simple HTTP tests, readable.
     Cons: not programmable enough for withEnv fixture pattern, can't handle
     gRPC/Connect, can't share cleanup logic across files.

CHOSEN: A — Deno test + vite-plus

REASON: The withEnv fixture pattern requires a programmable test runner. Deno
test is built-in, the pattern is already proven in Aether, and vite-plus
eliminates the need for a separate config file. The coverage tooling gap is
acceptable for a template-scale project.

REVISIT IF: The team needs rich coverage dashboards or visual test UI — at
that point, evaluate whether adding vitest is worth the extra config surface.
```

### 5.2 gRPC Client

```
DECISION: How to call the Go sidecar from TypeScript tests

OPTIONS CONSIDERED:
  A. @connectrpc/connect — Pros: if the sidecar speaks Connect protocol, this
     is just a typed fetch call. Minimal setup, no binary codec, shares the
     same Deno-native fetch. Type-safe from generated proto stubs.
     Cons: requires the sidecar to speak Connect (HTTP/1.1 or HTTP/2 with JSON
     or binary). If it speaks raw gRPC only, this won't work.
  B. @grpc/grpc-js — Pros: works with raw gRPC. Cons: Node-centric, verbose
     API, does not play well with Deno's module system without compatibility
     shims.
  C. nice-grpc — Pros: cleaner async/await API over grpc-js. Cons: still
     Node-centric, same Deno compatibility concerns.

CHOSEN: A — @connectrpc/connect [ASSUMPTION: sidecar speaks Connect]

REASON: If the Go sidecar uses connectrpc (which is the modern Go gRPC pattern),
the TypeScript client becomes trivial — the same fetch-based mental model as
the GraphQL client. This dramatically simplifies rpc_env.ts. The proto files
already exist in proto/template/v1/ — connect-es can generate typed stubs
from them with one codegen step.

REVISIT IF: The sidecar is confirmed to speak raw gRPC only — in that case,
evaluate nice-grpc with a Deno compatibility layer, or add a Connect gateway
in front of the sidecar specifically for testing.
```

### 5.3 Fixture Isolation Strategy

```
DECISION: How to keep tests order-independent without reseeding the entire DB

OPTIONS CONSIDERED:
  A. Full reseed before each test — Pros: guaranteed clean state.
     Cons: prohibitively slow. Reseeding takes seconds; with 60+ tests,
     the suite becomes unusable.
  B. Per-test cleanup registration — Each test that creates a record
     registers a DELETE query to run in the fixture's finally block.
     Pros: fast, surgical, tests only clean up what they created.
     Cons: if a test creates side-effect records (e.g., activity via events),
     those must also be cleaned up explicitly.
  C. Namespaced test records — All test-created records use a known prefix
     (e.g., `item:test_xxx`) and a single cleanup sweep at the end deletes
     all `test_*` records. Pros: simpler cleanup logic. Cons: prefix
     convention must be enforced everywhere.

CHOSEN: B — Per-test cleanup registration via withCleanup()

REASON: Matches the Aether pattern exactly. The withCleanup() helper in
lib/fixtures.ts accepts a teardown query and registers it to run in the
fixture's finally block. Tests that trigger events (like creating a comment
which writes to activity) register cleanup for both the comment and the
resulting activity records. This is explicit, debuggable, and fast.

REVISIT IF: The suite grows to 200+ tests and cleanup registration becomes
tedious — at that point, consider a test-scoped DB namespace (SurrealDB
supports multiple databases) where the entire test database is dropped
after each run.
```

### 5.4 Proto Codegen for Connect Client

```
DECISION: How to generate typed Connect stubs for the Go sidecar

OPTIONS CONSIDERED:
  A. buf generate at test setup time — Pros: always in sync with proto files.
     Cons: adds buf as a dev dependency, adds latency to test startup.
  B. Pre-generated stubs committed to the test directory — Pros: no codegen
     at runtime, tests start instantly. Cons: stubs can drift from protos
     if someone updates the proto without regenerating.
  C. Dynamic typing via serde_json / untyped fetch — Pros: no codegen.
     Cons: loses all type safety; defeats the purpose of using Connect.

CHOSEN: B — Pre-generated stubs committed to tests/generated/

REASON: For a solo template project, the discipline of "run buf generate
after changing protos" is sufficient. The generated directory is clearly
named and documented. A CI step can verify stubs are in sync by regenerating
and diffing. Type safety is preserved.

REVISIT IF: The proto files change frequently, making stub drift a real
problem — at that point, integrate buf generate into the just test task.
```

### 5.5 Subscription Testing

```
DECISION: How to test GraphQL subscriptions (live queries)

OPTIONS CONSIDERED:
  A. WebSocket client in e2e tests — Open a WS connection, subscribe,
     trigger a mutation, assert the subscription event arrives within
     a timeout. Pros: tests the actual subscription path.
     Cons: timing-sensitive, flaky if the subscription event is slow.
  B. Skip subscription testing in this suite, rely on manual validation —
     Pros: no flakiness risk. Cons: subscriptions are completely untested.
  C. Subscription smoke test — Open WS, assert the connection is accepted
     and the subscription query parses without error. Don't assert the
     event payload. Pros: tests the subscription infrastructure without
     timing sensitivity. Cons: doesn't test the full event flow.

CHOSEN: C for unit/integration, A for e2e (with generous timeout)

REASON: Subscription smoke tests in integration/ verify the WS endpoint
exists and accepts the subscription syntax. The full event flow (create item
→ subscription fires) is tested once in e2e/comment_flow.test.ts with a
generous timeout (3s) and a retry loop. One well-written e2e subscription
test is more valuable than many brittle ones.

REVISIT IF: Subscriptions become a core product feature — at that point,
invest in a proper async event test harness with deterministic ordering.
```

---

## 6. Phased Implementation Plan

### Phase 1 — Infrastructure (The Foundation)

- **Goal**: `lib/` and `fixtures/` are complete. A developer can write a test using `withSurrealEnv` and have it run. `just test` is wired.
- **Components to build**:
  1. `deno.json` — project config, import map, tasks (`test`, `test:db`, `test:api`, `test:rpc`).
  2. `vite.config.ts` — vite-plus config with test runner entry points.
  3. `lib/client.ts` — three client factories. Start with SurrealDB and API clients. RPC client can be a stub.
  4. `lib/assert.ts` — all five assertion helpers + `printSummary()`.
  5. `lib/fixtures.ts` — `getToken()`, `withCleanup()`, `seedRecord()`.
  6. `fixtures/surreal_env.ts` — `withSurrealEnv()`.
  7. `fixtures/api_env.ts` — `withApiEnv()` with JWT bootstrap.
  8. One smoke test in `unit/db/schema.test.ts` to verify the whole chain works.
  9. `just test` task in `server.just`.
- **Dependencies**: SurrealDB and Rust engine must be running. Deno in Nix flake.
- **Exit criteria**: `just test` runs, the one smoke test passes, and the output clearly labels it as 🗄️ group with pass/fail count.
- **Risk flags**: JWT bootstrap in `api_env.ts` requires the login mutation to be working. If it's not, use a directly-generated JWT via `JWT_SECRET` as fallback. See Section 9.

### Phase 2 — DB Test Coverage

- **Goal**: Every SurrealDB feature has passing tests. `just test db` is green.
- **Components to build**:
  1. `unit/db/schema.test.ts` — all ASSERT violation tests (email, role, rating, price_range).
  2. `unit/db/indexes.test.ts` — duplicate email, duplicate slug.
  3. `integration/db/computed.test.ts` — verify event-denormalized stats (create comment → item.rating updates).
  4. `integration/db/events.test.ts` — verify activity record written after comment creation.
  5. `integration/db/graph.test.ts` — forward traversal (`->likes->item`), reverse (`<-comment<-user`), `fn::user_recommendations` returns non-empty.
  6. `integration/db/functions.test.ts` — each `fn::` called with known seed data and verified.
  7. `integration/db/references.test.ts` — CASCADE and REJECT behaviors.
- **Dependencies**: Phase 1. SurrealDB with full schema + seed loaded.
- **Exit criteria**: `just test db` reports all tests passing. Zero order-dependent failures (run twice in different orders to verify).
- **Risk flags**: `fn::user_recommendations` requires careful seed data overlap to return non-empty. If it returns empty, the seed data matrix (likes per user) needs adjustment — not a test bug, a seed bug.

### Phase 3 — API & RPC Test Coverage

- **Goal**: Every GraphQL resolver and every RPC service method has a passing test. `just test api` and `just test rpc` are green.
- **Components to build**:
  1. `fixtures/rpc_env.ts` — `withRpcEnv()` with Connect client + token.
  2. `generated/` — buf-generated Connect stubs from `proto/template/v1/*.proto`.
  3. `integration/api/auth.test.ts` — login, bad credentials, logout.
  4. `integration/api/items.test.ts` — full CRUD including auth guards.
  5. `integration/api/comments.test.ts` — addComment, listComments.
  6. `integration/api/likes.test.ts` — toggleLike, verify count.
  7. `integration/api/search.test.ts` — searchItems, recommendations, popularItems, itemsNear.
  8. `integration/rpc/documents.test.ts` — generate call returns pdf_base64.
  9. `integration/rpc/notify.test.ts` — dispatch returns success.
- **Dependencies**: Phase 1. Rust engine and Go sidecar must be running.
- **Exit criteria**: `just test api` and `just test rpc` both green. The `addComment` test verifies not just the GraphQL response but also that a subsequent DB query shows updated stats (cross-layer assertion).
- **Risk flags**: [MEDIUM RISK] Connect codegen. If `buf generate` produces stubs with unexpected shapes, the rpc_env client construction needs adjustment. Spike codegen before writing rpc tests.

### Phase 4 — E2E & Security

- **Goal**: Full-stack flows and security properties are verified. `just test` (all groups) is green.
- **Components to build**:
  1. `e2e/smoke.test.ts` — seed counts, full-text search returns results, geo radius returns results.
  2. `e2e/comment_flow.test.ts` — GraphQL mutation → DB stats update → subscription fires.
  3. `e2e/recommendation_flow.test.ts` — likes via API → recommendations updated.
  4. `e2e/rpc_flow.test.ts` — create item → trigger document generation.
  5. `security/auth_required.test.ts` — mutations without token return auth error.
  6. `security/field_permissions.test.ts` — `item.internal_notes` not exposed to non-admin.
  7. `security/jwt_leakage.test.ts` — tampered/expired tokens rejected.
  8. `security/injection.test.ts` — search with SurrealQL metacharacters, GQL with fragment injection.
- **Dependencies**: Phases 1–3. Full stack running.
- **Exit criteria**: `just test` runs all groups, all pass. The security group specifically tests that failure modes work correctly (asserting that bad things are rejected, not just that good things work).
- **Risk flags**: [MEDIUM RISK] Subscription test timing (comment_flow.test.ts). Use a 3s timeout with a poll loop — if it becomes flaky, demote to smoke-level assertion (connection accepted only).

---

## 7. Implementation Management

### Sequencing

```
lib/ + fixtures/ (Phase 1)
    │
    ├──► DB tests (Phase 2)       ← needs SurrealDB running
    │
    └──► API/RPC tests (Phase 3)  ← needs Rust engine + Go sidecar running
              │
              └──► E2E + Security (Phase 4)  ← needs full stack
```

Phases 2 and 3 can be parallelized if desired (they have no dependency on each other). Phase 4 depends on both.

### Critical Path

```
lib/client.ts (SurrealDB error detection) → surreal_env.ts → DB tests
lib/fixtures.ts (getToken) → api_env.ts → API tests
proto codegen → rpc_env.ts → RPC tests
```

The SurrealDB client's error detection (checking `status: "ERR"` in the response body despite HTTP 200) is the most subtle implementation detail. Get it right first — it affects every DB test.

### Integration Points

1. **SurrealDB error format**: The client MUST check `response[0].status === "ERR"` not `response.status`. This is the #1 source of false-passing DB tests. Verify in Phase 1 by intentionally triggering an error and confirming `assertError` catches it.

2. **JWT format agreement**: The token returned by the GraphQL login mutation must be accepted by both the Rust engine (for GraphQL mutations) and the Go sidecar (for RPC calls). Verify this early in Phase 3 — if the sidecar uses a different JWT validation key or audience claim, `rpc_env.ts` needs its own token generation path.

3. **Cross-layer assertions in integration tests**: The `integration/api/comments.test.ts` test adds a comment via GraphQL and then queries the DB directly to verify the event fired. This means `withApiEnv` context must also carry a `surreal` client, OR the test imports both `withApiEnv` and uses `lib/client.ts` directly for the DB check. The cleaner approach: `api_env.ts` includes a raw SurrealDB client in its context specifically for verification queries.

### Breaking Changes

- [HIGH RISK] **Adding a `surreal` client to `api_env.ts` context**: If this is added in Phase 3, any test written in Phase 2 that expected `api_env` context to be `{ api, token, cleanup }` only must be updated. Define the full context shape in Phase 1 — add the `surreal` field from the start even if it's unused in early tests.
- [MEDIUM RISK] **Proto stub regeneration**: If the proto files change after Phase 3 stubs are generated, the RPC tests silently break because the generated types no longer match. Add a CI check.

---

## 8. Validation & Testing Strategy

### Test Matrix

| Layer | Test Type | What it verifies | How to run |
|---|---|---|---|
| DB schema constraints | Unit | ASSERTs reject invalid data, UNIQUE indexes prevent duplicates | `just test db:unit` |
| DB events + computed | Integration | Event side effects and denormalization are correct | `just test db:integration` |
| DB graph + functions | Integration | Traversals and fn:: calls return correct results | `just test db:integration` |
| GraphQL auth | Integration | Login/logout/token lifecycle | `just test api:integration` |
| GraphQL CRUD | Integration | All resolver shapes and auth guards | `just test api:integration` |
| gRPC methods | Integration | Each service method returns correct response shape | `just test rpc:integration` |
| Full stack flows | E2E | Multi-service journeys work end-to-end | `just test e2e` |
| Security properties | Security | Auth required, fields protected, inputs sanitized | `just test security` |
| Architecture fitness | CI | Domain purity, no cross-layer imports | `deno lint` + custom checks |

### Architecture Fitness Functions

1. **No direct fetch in test files**: A lint rule (or grep in CI) that fails if `fetch(` appears in any `*.test.ts` file. All HTTP calls must go through `lib/client.ts` factories.
2. **No token logic in test files**: Grep fails if `Authorization` or `Bearer` appears in any `*.test.ts` file.
3. **Fixture cleanup coverage**: Every `withSurrealEnv` test that calls `seedRecord` must have a corresponding cleanup registered. A static analysis check can verify this by comparing `seedRecord` call sites to `withCleanup` registrations.

### Local Dev Validation

1. `podman-compose up db` → DB running with seed.
2. `cargo run -p gateway` → Rust engine running.
3. `cd rpc && go run .` → Go sidecar running.
4. `just test` → full suite green.
5. Kill one service, re-run — confirm only the relevant group fails (not a cascade).

### Observability

- Test output uses emoji group prefixes (`🗄️`, `🦀`, `🐹`, `🔐`) for scannable CI logs.
- `printSummary()` at the end of each group reports `N passed, M failed` per service target.
- Failed assertions include the label string as the failure message — readable without digging into diffs.
- `--reporter=pretty` (Deno test flag) enables structured output per test.

---

## 9. Open Questions & Risks

### Open Questions

1. **Connect vs. raw gRPC for the sidecar**: The Go sidecar's protocol has not been confirmed. If it uses raw gRPC (`google.golang.org/grpc`), `@connectrpc/connect` won't work and the RPC client must use `nice-grpc` with a Deno compatibility shim. Confirm the sidecar's handler registration before starting Phase 3. [HIGH RISK if wrong]

2. **JWT fallback for bootstrapping**: The `api_env.ts` fixture needs a valid JWT to test protected routes. If the login mutation is unavailable (e.g., testing in isolation), the fixture should fall back to generating a JWT directly from `JWT_SECRET` env var. The Go `get_token.go` reference shows this pattern — port it to Deno. Decide whether this fallback is in-scope for Phase 1 or Phase 3.

3. **`api_env.ts` context shape**: Should the API fixture context include a `surreal` client for cross-layer verification? Including it from the start (Phase 1) avoids a breaking change later. The cost is one extra client in every API test context, even when unused.

4. **Subscription test determinism**: The `e2e/comment_flow.test.ts` subscription test requires a timing assumption (event fires within N ms). What is the acceptable timeout? 1s is too tight. 5s is too slow for a test suite. 3s with a poll loop is the working hypothesis — validate against the live stack before committing.

### Risks

1. **[HIGH RISK] gRPC client protocol mismatch**: If the sidecar speaks raw gRPC and the Connect client is used, RPC tests will fail silently (connection refused or wrong content-type). Spike the sidecar protocol before writing a single line of `rpc_env.ts`.

2. **[MEDIUM RISK] SurrealDB 200-with-error false positives**: If `lib/client.ts` doesn't correctly detect the `status: "ERR"` pattern, schema violation tests (`assertError` cases) will pass when they should fail. This creates a test suite that gives false confidence. Write one explicit test of the error detection in Phase 1 before proceeding.

3. **[LOW RISK] Token cache invalidation**: The `getToken()` cache stores a token for the test session. If a test invalidates the token (e.g., logout test), subsequent tests in the same session fail authentication. The logout test must either use a separate token or refresh the cache after logout. Design the cache to be invalidatable.

4. **[LOW RISK] Seed data matrix for recommendation tests**: `fn::user_recommendations` requires enough overlapping likes to produce non-empty results. If the seed data is sparse, the recommendation integration test passes vacuously (returns empty, `assertEmpty` passes — but this is wrong behavior for a recommendation function). The recommendation test MUST use `assertCount(label, result, n)` with `n > 0`, not `assertOk`.