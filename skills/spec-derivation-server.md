# GWA Server · Derivation Pipeline Specification

**Status:** Draft v1
**Scope:** Server-side only (`src/server/`)
**Supersedes:** Nothing — complements `GWA Server · Architectural Specification Plan`
**Audience:** Engineers implementing the codegen layer and maintaining the template

---

## 0. Executive Summary

This specification defines the **derivation pipeline** for the GWA server template: a four-layer system where every piece of repeated information has exactly one authored source and N generated consumers. The goal is not "less code" but **no parallel maintenance** — when a field changes in the one authoritative place, the change propagates mechanically to Rust, Go, TypeScript, and SurrealQL without human intervention. The architecture rests on four sources of truth (SurrealDB schema for data-at-rest, Protobuf for wire shapes, a Rust WASM crate for logic shared between server and browser, and the async-graphql-derived schema for client-facing API types), each of which produces generated artifacts that cannot be edited by hand. A minimum entity set — `User`, `Item`, and three graph edges (`created`, `liked`, `commented`) — is sufficient to exercise all seven SurrealDB capabilities that distinguish it from a traditional relational database, making the template genuinely small while remaining a complete demonstration of the stack. Fitness functions enforce the single-source rule in CI: if generated code drifts from its source, the build fails. This is a long-term bet on the principle that **duplication tolerated becomes drift guaranteed**, and that the cost of setting up codegen up front is repaid every time a field is added, renamed, or removed.

---

## 1. Context & Constraints

### 1.1 Where This Fits

The parent `GWA Server · Architectural Specification Plan` defined the high-level shape of the server: Rust gateway + Go sidecar + SurrealDB, hexagonal architecture, tri-path validation. This document specifies **how information flows between the layers** without duplication. It is a refinement, not a replacement.

Current state snapshot (as of spec authoring):

| Concern | Current Source | Consumers | Duplication? |
|---|---|---|---|
| Item DTO shape | Hand-written in `sdk/core/entities/item.ts` AND `domain/src/entities/item.rs` AND `db/init/01-schema/` | Three (client, server domain, database) | **Yes** |
| Wire messages (gRPC) | `proto/template/v1/*.proto` | Rust (tonic-prost), Go (buf generate) | No — already single-source |
| Email validation | Implicit in SurrealQL `ASSERT` + likely duplicated in any client form | Database + anywhere doing client validation | **Yes** |
| GraphQL schema | Derived from Rust structs via `async-graphql` | Client (currently manual types) | **Partial** — derived on server, hand-mirrored on client |
| Entity validation logic (slug, coordinates, engagement scores) | Scattered | Various | **Yes, ambient** |

The three "Yes" rows are the target. This spec turns them into generated code with enforced consistency.

### 1.2 Goals

1. **One authored source per category of information** — data shape, wire shape, shared logic, API surface
2. **Generated code is read-only** — humans never edit a generated file; CI fails if they do
3. **Minimum entity set that exercises all seven SurrealDB capabilities** — schema-full constraints, unique indexes, graph edges, full-text search, geospatial, events, live queries
4. **Fitness functions enforce the single-source rule** — `just sync-check` regenerates everything and fails if anything drifts
5. **The template is mechanically forkable** — changing the demo entity to a real domain entity is a handful of well-defined edits, not a hunt-and-replace

### 1.3 Out of Scope

- **Client-side codegen consumption** — this spec defines what the server *produces*. How the client consumes `schema.graphql` via `graphql-codegen` is a client concern.
- **Second entity scaffolding (`just scaffold-entity`)** — a generator that creates N files from a single entity spec is a valuable future tool, but proving the derivation works with one entity comes first. Build the generator after the second entity is added manually and the duplication rules are concrete.
- **SurrealDB schema as generated output** — SurrealQL `DEFINE TABLE` files remain hand-authored. Options for generating them from another source exist but all add more complexity than they remove for a template this size.
- **WASM consumption in Go** — the sidecar does not participate in WASM-shared logic. Wire shapes via protobuf are enough for the sidecar's operational scope.
- **Performance budgets and load testing** — this spec focuses on correctness of derivation, not runtime performance.

### 1.4 Assumptions

[ASSUMPTION] `protoc-gen-es` (v2) or `@bufbuild/protobuf` is the target TypeScript protobuf generator. The current server tests showed a v1/v2 mismatch; the spec assumes this gets resolved as part of Phase 0 prerequisites.

[ASSUMPTION] `wasm-bindgen` is the WASM binding strategy, with `tsify` for type exposure. Alternatives (`wit-bindgen`, hand-written `extern "C"`) were not evaluated in depth because `wasm-bindgen` is the incumbent and the ecosystem is richest.

[ASSUMPTION] `async-graphql` continues to expose schema introspection via SDL export. If it doesn't in v8 stable, Phase 4 needs a different mechanism.

[ASSUMPTION] The minimum entity set (User + Item + three edges) is sufficient for the template's demonstration purpose. If future feedback suggests a second entity is needed to prove the pattern, Phase 5 adds it — but the spec deliberately resists feature creep.

---

## 2. Architecture Overview

### 2.1 The Four Sources of Truth

Every piece of information in the server falls into exactly one of four categories. Each category has exactly one authored source.

**Category 1 — Data at rest.** How information is stored, indexed, constrained, and mutated inside SurrealDB. Authored in `db/init/01-schema/`, `db/init/03-functions/`, `db/init/04-events/`. Owns: table definitions, field types, assertions (enum/range/regex), unique indexes, full-text analyzers, geospatial indexes, custom functions, event triggers. Consumed directly by SurrealDB at database startup; no downstream generation.

**Category 2 — Wire shapes.** Structs that cross a network boundary (gateway ↔ sidecar over gRPC; gateway ↔ client via GraphQL types derived from these). Authored in `proto/template/v1/*.proto`. Owns: entity DTOs (`User`, `Item`, `Comment`, `Coordinates`), enums visible on the wire (status, capability), gRPC service definitions. Generates: Rust structs via `tonic-prost-build`, Go structs via `buf generate`, TypeScript interfaces via `protoc-gen-es` (consumed by client).

**Category 3 — Shared logic.** Pure functions that must produce identical results in server Rust and in the browser. Authored in `engine/services/wasm/src/lib.rs`. Owns: validators (email, slug normalization, coordinate bounds), scoring functions (engagement, rating aggregation), parsers. Consumed: as a normal Rust library by the gateway, and as a WebAssembly module by the client. Same source, two compilation targets, zero drift.

**Category 4 — Client-facing API surface.** The GraphQL schema that clients query against. Authored implicitly via `async-graphql` derive macros on Rust types in `gateway/src/adapters/graphql/`. Exported as `schema.graphql` via a `just schema:export` command. Consumed: by any client via `graphql-codegen` to produce typed query helpers (client concern, out of scope here); by CI to detect API changes.

The critical design property: **these four categories do not overlap**. A field on `Item` appears in Category 1 (as a `DEFINE FIELD` statement), in Category 2 (as a `message Item` field), and in Category 4 (exposed via GraphQL). It does *not* appear three times hand-authored. Category 1 is authored by the DBA/platform engineer. Category 2 is authored in a `.proto` file and generates the Rust struct. The Rust struct is then used in the Category 4 resolvers, where `async-graphql` exposes it to GraphQL. Three surfaces, two authored sources (schema + proto), and the Rust struct in the middle is generated.

### 2.2 Derivation Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                       CATEGORY 1 — DATA AT REST                      │
│                                                                      │
│   db/init/01-schema/*.surql          ← AUTHORED                      │
│   db/init/03-functions/*.surql       ← AUTHORED                      │
│   db/init/04-events/*.surql          ← AUTHORED                      │
│                                                                      │
│   Consumed by: SurrealDB at container startup                        │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                      CATEGORY 2 — WIRE SHAPES                        │
│                                                                      │
│   proto/template/v1/entities.proto   ← AUTHORED (new)                │
│   proto/template/v1/notify.proto     ← AUTHORED (exists)             │
│   proto/template/v1/documents.proto  ← AUTHORED (exists)             │
│                                                                      │
│             │                    │                    │              │
│             ▼                    ▼                    ▼              │
│   Rust structs          Go structs          TS interfaces            │
│   (tonic-prost)         (buf generate)      (protoc-gen-es)          │
│   → engine/            → rpc/gen/           → [client consumes]      │
│                                                                      │
│   Fitness: `just proto:check` — regenerate, fail on diff             │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                      CATEGORY 3 — SHARED LOGIC                       │
│                                                                      │
│   engine/services/wasm/src/lib.rs    ← AUTHORED                      │
│                                                                      │
│             │                                    │                   │
│             ▼                                    ▼                   │
│   Rust library (native)              WebAssembly module              │
│   used by gateway                    (cdylib + wasm-bindgen)         │
│   for server-side validation         consumed by client              │
│                                                                      │
│   Fitness: `just wasm:check` — build both targets successfully       │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                   CATEGORY 4 — CLIENT-FACING API                     │
│                                                                      │
│   engine/services/gateway/src/adapters/graphql/  ← AUTHORED          │
│   (Rust types with async-graphql derive macros)                      │
│                                                                      │
│                            │                                         │
│                            ▼                                         │
│   schema.graphql (exported SDL)      ← GENERATED, COMMITTED          │
│                                                                      │
│   Consumed by: CI diff check; client `graphql-codegen`               │
│                                                                      │
│   Fitness: `just schema:check` — export, diff against committed      │
└──────────────────────────────────────────────────────────────────────┘
```

The horizontal axis here is deliberate: each category sits alone. The one place they intersect is inside the gateway crate, which *uses* the generated proto structs and *exposes* them via `async-graphql`. That intersection is not duplication — it's consumption. The gateway crate reads from three categories (proto-generated Rust, WASM crate, domain entities) and produces one (the GraphQL schema export).

### 2.3 What the Minimum Entity Set Proves

The template's demo entity set is deliberately small: **one user-type entity (`User`) and one domain entity (`Item`), joined by three graph edges (`created`, `liked`, `commented`)**. This is the minimum that exercises all seven SurrealDB capabilities. Adding a second domain entity (e.g., `Tag`, `Category`) does not demonstrate any *new* capability — it only duplicates the patterns already present.

The mapping from the minimum set to SurrealDB's capabilities:

**Schema-full constraints.** `User.email` has a regex assertion; `User.role` is an enum; `Item.status` is an enum (`draft | published | archived`); `Comment.rating` asserts `1 <= rating <= 5`. Every assertion type (regex, enum, range) is represented without inventing ceremonial fields.

**Unique indexes.** `User.email` is unique; `Item.slug` is unique. Two unique indexes are enough to prove the pattern — more are redundant.

**Graph edges as first-class citizens.** The three edges (`created`, `liked`, `commented`) exercise three distinct edge semantics: an ownership edge (one producer per item), a set-membership edge (many users, idempotent add/remove), and a content-carrying edge (the `commented` edge stores the comment body and rating as edge properties). Traversals in both directions (`SELECT ->liked->item FROM $user` and `SELECT <-liked<-user FROM $item`) are both exercised by the GraphQL resolvers. Collaborative filtering (recommendations) requires a two-hop graph traversal, which proves graph queries beyond simple adjacency.

**Full-text search.** `DEFINE ANALYZER item_analyzer TOKENIZERS class FILTERS lowercase, ascii, snowball(english)` applied to `Item.title` and `Item.description`. Exposed as `fn::search_items($query, $limit)`. One function, one analyzer, all BM25 concepts covered.

**Geospatial.** `Item.coordinates: geometry<point>`, indexed with `DEFINE INDEX ... TYPE MTREE`. Exposed as `fn::items_near($coordinates, $radius_meters, $limit)`. One column, one index, one function.

**Events (triggers).** `DEFINE EVENT on_comment_created WHEN $event = "CREATE" THEN { ... }` recalculates `Item.rating` (mean of associated comments) and `Item.comment_count` (count). A second event `on_item_liked` writes to an activity log. This pattern — computed fields maintained atomically by the database, not by application code — is where SurrealDB genuinely differs from Postgres, and it's the one most likely to surprise engineers familiar only with relational databases.

**Live queries.** `LIVE SELECT FROM item WHERE id = $id` exposed as a GraphQL subscription. One subscription demonstrates the entire live-query lifecycle (register → receive → unregister). Multiple subscriptions would teach nothing additional.

Seven capabilities, one entity, one user type, three edges. The template does not grow to demonstrate more; it shrinks until nothing can be removed without losing a capability.

---

## 3. Design Patterns & Code Standards

### 3.1 Single Source of Truth Per Category

**Pattern:** Single Source of Truth with Mechanical Derivation

**Why:** Tolerated duplication becomes guaranteed drift. A field added to `Item` in Rust but forgotten in the TypeScript mirror is a bug that compiles cleanly and explodes at runtime. Over a 5-year codebase lifetime, the cost of setting up codegen is repaid on the first non-trivial schema change.

**How it's applied:** Each of the four categories has exactly one authored location, defined in §2.1. Generated artifacts are produced by named commands in the `justfile` (e.g., `just proto:gen`, `just schema:export`, `just wasm:build`). Generated artifacts are committed to the repository so that (a) builds are deterministic from a fresh clone and (b) code reviewers can see the diff when an authored source changes.

**What it protects against:**
- **Year 3:** New team members don't accidentally hand-write a mirror of an existing definition because there's no example of hand-mirroring to follow.
- **Year 5:** When a fourth language is added (e.g., Python for ML services), the proto definitions already exist — adding Python is a single `buf.gen.yaml` addition, not a manual translation of 30 structs.
- **Year 10:** The codebase still works because every authored source was small, reviewed, and unambiguous. Rot sets in when duplication accumulates faster than it's cleaned up; this architecture prevents accumulation.

**Standards:**
- Every generated file has a header comment `// @generated · do not edit · source: <path> · regenerate with: just <command>`
- Generated files are committed and tracked — they are part of the repo's snapshot, not a build artifact
- The `just sync-check` aggregate command regenerates everything and fails if anything differs from the committed version
- Pre-commit hooks run `just sync-check` as a fast fail; CI runs it as the final gate

### 3.2 Generated Code Is Read-Only

**Pattern:** Immutable Generated Artifacts

**Why:** If engineers edit generated files "just this once" to work around a limitation, the file silently diverges from its source. Next regeneration wipes the edit, which either (a) reintroduces the original bug or (b) surprises the engineer who made the edit. Both outcomes corrode trust in the codegen pipeline.

**How it's applied:** Generated files are committed with a clear header warning. Pre-commit hooks refuse commits that modify generated files unless the source was also modified. CI's `sync-check` regenerates and fails on any diff — this catches both manual edits and forgotten regeneration after a source change.

**Standards:**
- No conditional logic is ever added to a generated file. If a generated struct lacks a field the code needs, the correct fix is to add the field to the authored source (`.proto` or Rust struct) and regenerate.
- If codegen produces output that's subtly wrong (e.g., naming conflicts), the fix is a codegen-level adapter (a non-generated file that wraps the generated one), not an edit to the generated file itself.

### 3.3 Fitness-Function-Driven Boundaries

**Pattern:** Architecture Fitness Functions

**Why:** Rules that exist only in documentation decay. Rules that exist in CI as failing checks are rules that hold.

**How it's applied:** Each boundary this spec introduces has a corresponding automated check:

| Rule | Fitness Function | Failure Mode |
|---|---|---|
| Proto-generated code matches `.proto` sources | `just proto:check` | Regenerates and `git diff --exit-code` |
| WASM crate builds for both native and `wasm32-unknown-unknown` | `just wasm:check` | Build failure on either target |
| GraphQL schema export matches committed `schema.graphql` | `just schema:check` | Export and `git diff --exit-code` |
| Domain crate has no dependencies on store, application, or gateway | `just arch:check` | Parse `Cargo.toml`, fail on forbidden dep |
| No hand-edits to generated files | `just sync-check` | Regeneration produces no diff |

All fitness functions are aggregated under `just quality` and run in CI. A PR cannot merge with a failing fitness function, period.

### 3.4 Hexagonal Preservation Through Conversion Layers

**Pattern:** Anti-Corruption Layer between Generated and Domain Types

**Why:** Proto-generated Rust structs are wire DTOs, not domain entities. They have `Option<T>` everywhere (protobuf's default), they lack domain invariants, and they carry protobuf-specific annotations. Letting them leak into the domain crate would force the domain to accommodate protobuf's shape instead of the domain's own shape.

**How it's applied:** The `domain` crate keeps its own entities (`User`, `Item`, `Comment`) as hand-authored Rust structs with domain-appropriate types (e.g., `EmailAddress` newtype instead of raw `String`, `NonNegativeCount` instead of `u32`). The gateway layer contains `From` impls in both directions between generated proto structs and domain entities. These conversions are the only place where wire types and domain types touch.

**What this preserves:** The domain crate's "zero external dependencies" rule from the parent architectural spec. Proto-generated code is a dependency of the gateway, not of the domain.

**Standards:**
- `From<ProtoItem> for DomainItem` lives in `gateway/src/adapters/grpc/conversions.rs` (or equivalent)
- Conversion failures (e.g., proto had `None` for a required domain field) become explicit errors, not silent defaults
- Domain entities are never serialized directly to the wire — they always pass through a proto conversion first

---

## 4. Component Map & Directory Structure

### 4.1 The Minimum Schema (Phase 1 Output)

**Responsibility:** Define the minimum SurrealDB schema that exercises all seven capabilities with the `User + Item + 3 edges` entity set.

**Location:** `src/server/db/init/`

**Files to author/trim:**

- `01-schema/01-users.surql` — `User` table with `email` (unique, regex-asserted), `password_hash`, `display_name`, `role` (enum: `guest | consumer | producer | admin`), `created_at`
- `01-schema/02-items.surql` — `Item` table with `title`, `description`, `slug` (unique), `status` (enum: `draft | published | archived`), `tags` (array), `coordinates` (geometry<point>), `rating` (float, computed), `comment_count` (int, default 0, computed), `created_at`, `updated_at`
- `01-schema/03-relations.surql` — the three edge tables (`created`, `liked`, `commented`). `commented` carries `body` and `rating` as edge properties; `liked` has a unique constraint on `(user_id, item_id)` to enforce idempotency
- `02-indexes/` — full-text analyzer on `Item.title` + `Item.description`, MTREE index on `Item.coordinates`, unique indexes on `User.email` and `Item.slug`
- `03-functions/` — `fn::search_items`, `fn::items_near`, `fn::popular_items`, `fn::recommendations`
- `04-events/` — `on_comment_created` (recalculates `Item.rating` and `Item.comment_count`), `on_comment_deleted` (mirror), `on_item_liked` (activity log append)
- `05-seed/` — minimum fixture data: three users (one per non-admin role), four items across two producers, a handful of comments and likes that make the recommendation function return non-empty results

**What it must NOT do:**
- Define additional entity types (Tag, Category, Session-as-entity) — sessions live in auth infrastructure, not in the demo schema
- Define table constraints that are enforced in application code (those belong to the domain layer)
- Seed personally-identifiable or brand-specific data (no "XIBALBA", no restaurant names — generic labels only)

**Tests (existing Hurl suite, to be verified/extended):**
- `schema-email.hurl` — email regex rejection
- `schema-role.hurl` — role enum rejection
- `schema-status.hurl` — item status rejection
- `schema-rating.hurl` — rating range rejection
- `unique-email.hurl` — duplicate email rejection
- `unique-slug.hurl` — duplicate slug rejection
- `fn-search-items.hurl` — full-text search returns ranked results
- `fn-items-near.hurl` — geospatial returns items within radius
- `fn-popular-items.hurl` — popular function returns ordered results
- `graph-forward-reverse.hurl` — both traversal directions work
- `graph-recommendations.hurl` — collaborative filtering returns results
- `reference-cascade-delete.hurl` — deleting a user cascades to their sessions
- `event-comment-creates-activity.hurl` — activity log append on comment
- `event-like-creates-activity.hurl` — activity log append on like
- `computed-item-stats.hurl` — rating and comment_count update on comment create

### 4.2 Protobuf Entities (Phase 2 Output)

**Responsibility:** Define entity DTOs once in protobuf, generate Rust/Go/TS from a single source.

**Location:** `src/server/proto/template/v1/`

**Files to author:**

- `entities.proto` (new) — messages: `User`, `Item`, `Comment`, `Coordinates`, `Capability` (enum), `ItemStatus` (enum), `ActivityEvent`
- `notify.proto` (existing) — unchanged, but confirmed buf-toolchain-version-aligned with entities.proto
- `documents.proto` (existing) — same

**Generated outputs (committed):**

- Rust: `engine/services/gateway/src/gen/template.v1.rs` (via `tonic-prost-build` in `build.rs`)
- Go: `rpc/gen/template/v1/*.pb.go` (via `buf generate`)
- TypeScript: committed to the client side — generation configured here but artifacts land in client (out-of-scope path)

**Conversion layer (authored, in gateway):**

- `gateway/src/adapters/grpc/conversions.rs` — `From<proto::Item> for domain::Item`, `From<domain::Item> for proto::Item`, and the same for `User`, `Comment`, `Coordinates`

**What it must NOT do:**
- Include fields that exist only in the database (e.g., `password_hash`) — these are internal, not wire-level
- Include fields that exist only in the domain (e.g., validated newtypes) — those are domain-internal, wire uses raw strings
- Depend on any non-protobuf definitions (proto is a leaf in the dependency graph)

### 4.3 WASM Shared Logic (Phase 3 Output)

**Responsibility:** Host pure functions that must produce identical results in the server Rust process and in the browser WebAssembly runtime.

**Location:** `src/server/engine/services/wasm/`

**Files to author:**

- `src/lib.rs` — top-level module, exports via `#[wasm_bindgen]` and `pub` for native consumers
- `src/validators.rs` — `validate_email`, `validate_slug`, `validate_coordinates` (bounds check on lat/lng), `normalize_slug` (lowercase, strip accents, replace whitespace with hyphens)
- `src/scoring.rs` — `compute_engagement_score` (e.g., Wilson score interval for rating + comment_count), `compute_recency_weight` (for ranking freshness)
- `src/lib.rs` also declares `#[derive(Tsify)]` on any structs that need to cross the WASM boundary as rich types (e.g., `ValidationResult` with error details)

**Generated outputs:**
- Rust native library (consumed by gateway) — produced by normal `cargo build`
- WebAssembly module + TypeScript glue (`pkg/` directory via `wasm-pack build`) — consumed by client

**What it must NOT do:**
- Depend on `tokio`, `reqwest`, or any async/IO crate — WASM target would fail to compile
- Depend on the `domain` or `store` crates — WASM is a leaf utility, not a consumer of domain logic
- Perform I/O or side effects of any kind — pure functions only
- Reimplement logic that already lives in SurrealDB schema assertions (the database owns at-rest validation; WASM owns pre-wire validation)

**Consumers:**
- `gateway` crate — depends on `wasm` crate as a normal Rust dep, calls functions as normal Rust code
- Client (out of scope) — consumes the `wasm-pack`-produced module

### 4.4 GraphQL Schema Artifact (Phase 4 Output)

**Responsibility:** Produce a committed `schema.graphql` file that's always in sync with the Rust-authored resolvers.

**Location:** `src/server/engine/services/gateway/`

**Files involved:**

- Authored: `gateway/src/adapters/graphql/*.rs` — Query, Mutation, Subscription, and the GraphQL type impls (via `async-graphql` derive macros)
- Generated (committed): `gateway/schema.graphql` — SDL export of the schema

**Tooling:**

- A new binary target in the gateway crate: `bin/export-schema.rs` that instantiates the schema and writes its SDL to stdout
- `just schema:export` pipes the binary's output to `gateway/schema.graphql`
- `just schema:check` runs the export into a temp file and diffs against committed — exit code non-zero on drift

**What it must NOT do:**
- Introduce types that aren't used in a resolver (dead types pollute the schema)
- Expose internal types like `PasswordHash` or database record IDs as raw strings where domain IDs would be clearer

**Consumers:**
- Client codegen (out of scope)
- CI diff review — `schema.graphql` changes are reviewed like any source file

### 4.5 Directory Tree (Delta from Current)

Only showing *changes* from the current server tree. Unchanged paths are omitted.

```
src/server/
├── justfile                     # + schema:export, schema:check, proto:check,
│                                #   wasm:check, sync-check, arch:check
│
├── db/
│   └── init/
│       ├── 01-schema/           # TRIMMED: drop any demo-extra entities
│       ├── 03-functions/        # KEEP AS-IS (all 4 fns needed for capabilities)
│       └── 04-events/           # KEEP AS-IS (both events needed)
│
├── engine/
│   ├── services/
│   │   ├── gateway/
│   │   │   ├── build.rs         # UPDATED: also compile entities.proto
│   │   │   ├── schema.graphql   # NEW: committed GraphQL SDL artifact
│   │   │   └── src/
│   │   │       ├── bin/
│   │   │       │   └── export-schema.rs   # NEW
│   │   │       ├── gen/
│   │   │       │   └── template.v1.rs     # NEW: generated from proto
│   │   │       └── adapters/
│   │   │           ├── grpc/
│   │   │           │   └── conversions.rs # NEW: proto ↔ domain mapping
│   │   │           └── graphql/
│   │   │               └── *.rs           # UPDATED: use domain types,
│   │   │                                  # convert to/from proto at edges
│   │   └── wasm/
│   │       ├── Cargo.toml       # UPDATED: add tsify, wasm-bindgen deps
│   │       └── src/
│   │           ├── lib.rs       # UPDATED: module entry + wasm-bindgen exports
│   │           ├── validators.rs # NEW
│   │           └── scoring.rs    # NEW
│   └── core/
│       └── domain/
│           └── src/entities/    # UPDATED: ensure newtypes for validated fields
│
├── proto/
│   ├── buf.yaml                 # CONFIRMED alignment with v2 tooling
│   ├── buf.gen.yaml             # UPDATED: emit entities.proto stubs
│   └── template/v1/
│       └── entities.proto       # NEW
│
└── scripts/
    ├── check-sync.sh            # NEW: aggregate fitness function
    └── check-arch.sh            # NEW: dependency direction enforcement
```

---

## 5. Trade-off Analysis

### 5.1 Protobuf vs. Alternative Schema DSLs

```
DECISION: Protobuf as the wire-shape source of truth for entity DTOs
OPTIONS CONSIDERED:
  A. Protobuf — generates Rust/Go/TS; already set up for gRPC;
     downsides: proto3 optional semantics are awkward, no first-class
     validation DSL, requires buf toolchain
  B. JSON Schema — language-neutral, rich validation; 
     downsides: mediocre Rust/Go tooling, TS story via quicktype is fragile
  C. TypeSpec (Microsoft) — cleaner DSL, emits OpenAPI/JSON Schema/proto;
     downsides: young ecosystem, another toolchain to learn, overkill here
  D. Smithy (AWS) — rigorous, model-first;
     downsides: Java-centric tooling, complexity exceeds template's needs
  E. Rust-first (derive TS from Rust via ts-rs/typeshare) —
     clean if everything is Rust; 
     downsides: Go gets nothing, breaks the "one source generates N" property
CHOSEN: A (Protobuf)
REASON: The infrastructure is already in place for gRPC payloads. Extending
  it to cover entity DTOs is a few lines of buf.gen.yaml plus one new .proto
  file. No new toolchain, no new mental model. The awkwardness of proto3
  optional semantics is real but manageable via the conversion layer
  (§3.4) — conversions between proto and domain types are where we
  translate Option<String> into strongly-typed newtypes anyway.
REVISIT IF: We need schema-level validation richer than protobuf offers
  (e.g., regex patterns, min/max on fields at the wire level). Today we
  enforce those at the domain layer via newtype constructors, which is the
  right place for them anyway. If that assumption changes, reconsider.
```

### 5.2 WASM Scope: Validation Only vs. Broader Logic

```
DECISION: WASM crate scope — what lives there on day one
OPTIONS CONSIDERED:
  A. Validation only — email, slug, coordinates. Smallest possible surface.
  B. Validation + scoring — add engagement_score, recency_weight.
     Broader shared logic, but still all pure-function small utilities.
  C. Validation + scoring + entity structs — also expose User/Item
     via wasm-bindgen so the browser gets typed entity constructors.
CHOSEN: B (Validation + scoring)
REASON: Validation alone doesn't justify the WASM toolchain cost — a
  pure JS email regex would be "good enough" and the template would feel
  over-engineered. Adding scoring functions makes WASM carry its weight:
  the engagement score formula shouldn't diverge between the server's
  ranking and any client preview, and these aren't trivially portable
  as JS (floating-point semantics, for one). Entity structs (Option C)
  are overkill for a template — proto already gives the browser typed
  entity interfaces via protoc-gen-es; WASM structs would be a third
  parallel representation.
REVISIT IF: The engagement scoring logic becomes complex enough that
  keeping it in WASM slows iteration, OR if client-side preview becomes
  a performance bottleneck justifying richer WASM exports.
```

### 5.3 Schema Snapshot Discipline

```
DECISION: Commit schema.graphql to the repository
OPTIONS CONSIDERED:
  A. Commit schema.graphql — reviewers see API diffs in PRs; 
     downside: another file to keep in sync (but CI enforces it)
  B. Gitignore schema.graphql, generate fresh — simpler to author;
     downside: API changes are invisible in PR review; client breaks
     silently when resolver signatures change
  C. Export schema.graphql from a running server at CI time — truly
     fresh; downside: requires CI to stand up the server just for this
CHOSEN: A (Commit the schema)
REASON: The schema IS the API contract. API changes that aren't visible
  in PR review are API changes without review. Reviewers need to see
  "this PR removes the `comments` field from Item" as a diff. CI
  enforces freshness via `schema:check`, so the only way schema.graphql
  is stale is if someone explicitly committed a stale version — which
  fails CI immediately. Option C adds complexity without benefit.
REVISIT IF: Schema becomes so large that diffs are unreadable. At that
  point, split into multiple .graphql files per domain area.
```

### 5.4 Scaffolder Now vs. Later

```
DECISION: Do not build `just scaffold-entity` in this spec
OPTIONS CONSIDERED:
  A. Build a scaffolder now — `just scaffold-entity Event` creates
     schema files, proto messages, domain entity, use case, GraphQL
     types, Hurl tests. Proves the architecture is template-able.
  B. Document the N-file ritual — the fork user manually edits
     ~14 files to rename Item to their own entity.
  C. Defer until a second entity is added manually — learn where
     the friction actually is, then automate the real patterns.
CHOSEN: C (Defer until after adding a second entity manually)
REASON: Building a generator before knowing what's actually duplicated
  risks encoding the wrong patterns. The events use case (from prior
  discussion) is the natural candidate for a second entity — once it
  exists alongside Item, the friction points are concrete and the
  generator almost writes itself. Building generically first is
  speculative architecture.
REVISIT IF: Fork users consistently report pain at the "rename Item to
  my entity" step. If three separate forks report the same friction,
  the scaffolder is overdue.
```

### 5.5 Proto Messages as Domain Entities vs. Wire DTOs

```
DECISION: Proto messages are wire DTOs, not domain entities
OPTIONS CONSIDERED:
  A. Proto messages ARE the domain entities — use them directly in
     application and store layers. Zero conversion. Smallest code.
  B. Proto messages are wire DTOs; domain has its own hand-authored
     entities with invariants enforced via newtypes. Conversion layer
     at the wire boundary.
  C. Domain entities are the source; proto is generated FROM Rust
     domain structs (via prost-build reverse mode or similar).
CHOSEN: B (DTOs + domain entities + conversion layer)
REASON: Option A couples the domain model to protobuf's shape forever.
  Adding a non-nullable invariant (e.g., "rating is always 1..=5")
  is awkward because proto3 makes everything optional. Validated
  newtypes in the domain are the right place for invariants. Option C
  is theoretically appealing but tooling for "generate proto from Rust"
  is immature and loses the language-neutrality that makes proto
  valuable in the first place. B is the mainstream hexagonal
  architecture pattern, and the conversion layer is small (10s of
  lines per entity), well-tested, and easy to review.
REVISIT IF: The conversion layer becomes a bottleneck for iteration
  speed. If every entity change requires manual conversion edits,
  consider a derive macro that generates conversions from annotations.
```

---

## 6. Phased Implementation Plan

### Phase 1 — Minimum Schema (7 Capabilities, One Entity)

**Goal:** The SurrealDB schema is the smallest possible configuration that exercises all seven differentiating capabilities, and it is exhaustively tested.

**Components to build:**
- Audit current `db/init/` contents against the seven capabilities listed in §2.3
- Remove any entity, function, or event that doesn't serve a capability demonstration (ceremonial Tag or Category tables, if present)
- Ensure the four custom functions (`search_items`, `items_near`, `popular_items`, `recommendations`) are present and minimal
- Ensure the two events (`on_comment_created`, `on_item_liked`) are present
- Verify the seed data produces non-empty results for every function
- Verify the Hurl suite has one test file per capability (one test file per `.surql` fragment it exercises)

**Dependencies:** None — this is a scoping/cleanup phase on existing work.

**Exit criteria:**
- `just db test` runs the full Hurl suite, 15+ tests, 100% passing
- Every capability in §2.3 is covered by at least one Hurl test
- No entity exists in `db/init/` that doesn't appear in the capability coverage table
- `db/README.md` documents the capability-to-test mapping

**Risk flags:** Low — this is constraint-tightening on an existing working system. The main risk is removing something that a downstream (engine, gateway) depends on; mitigated by running the full test triangle after each removal.

---

### Phase 2 — Protobuf as Wire-Shape Source

**Goal:** Entity DTOs (`User`, `Item`, `Comment`, `Coordinates`, `ActivityEvent`) are defined once in `entities.proto` and generated into Rust and Go; the TypeScript generation path is configured (consumption is client-side and out of scope).

**Components to build:**
- Author `proto/template/v1/entities.proto` with the entity messages and associated enums
- Update `proto/buf.gen.yaml` to emit entities alongside the existing service definitions
- Update `engine/services/gateway/build.rs` to compile `entities.proto` via `tonic-prost-build`
- Update `rpc/` buf invocation to generate Go stubs for entities (even though the sidecar may not use them immediately — having them aligned is the point)
- Create `gateway/src/adapters/grpc/conversions.rs` with `From` impls between generated proto structs and domain entities
- Update GraphQL resolvers to continue using domain types internally but convert from/to proto at the gRPC wire boundary where applicable
- Add the `just proto:check` fitness function (regenerate, `git diff --exit-code`)

**Dependencies:** Phase 1 complete (the schema's entity set must be stable before proto definitions mirror it).

**Exit criteria:**
- `entities.proto` compiles cleanly via `buf build`
- Generated Rust code compiles and the conversion layer round-trips without loss for all entity types
- `cargo test --workspace` passes (conversion tests are the critical new coverage)
- `just proto:check` passes — no drift between `.proto` and committed generated code
- A new field added to `Item` in `entities.proto` triggers a regeneration that makes the conversion layer fail to compile (caught at build time, not runtime) — verified by a deliberate spike

**Risk flags:**
- [HIGH RISK] The existing protobuf-es v1/v2 mismatch visible in the earlier test output must be resolved before this phase. Phase 2 assumes a clean v2 baseline.
- Conversion layer authorship can become tedious. If it becomes a maintenance burden, investigate derive macros; for three entity types it's manageable.

---

### Phase 3 — WASM as Shared-Logic Source

**Goal:** Validators and scoring functions live in one Rust crate that compiles to both native (consumed by gateway) and WebAssembly (consumed by client).

**Components to build:**
- Audit the gateway and domain layers for validation logic (email regex, slug handling, coordinate bounds) — identify every duplicate
- Move canonical implementations to `engine/services/wasm/src/validators.rs` and `scoring.rs`
- Update gateway-side callers to import from the wasm crate (which is a normal Rust dep for native builds)
- Add `#[wasm_bindgen]` exports and configure the crate with `crate-type = ["cdylib", "rlib"]`
- Add `wasm-pack build` step for the WASM target
- Add `just wasm:check` fitness function (build both `--target native` and `--target wasm32-unknown-unknown` successfully)
- Document the rule: "any function that must produce identical results in browser and server lives here"

**Dependencies:** Phase 1 (schema must be stable so that validators match schema assertions). Phase 2 helpful but not strictly required.

**Exit criteria:**
- `engine/services/wasm/` builds for both native and `wasm32-unknown-unknown` targets
- All pre-existing duplicate validation logic in the gateway has been deleted and replaced with wasm crate calls
- Unit tests in the wasm crate cover every exported function
- `cargo test -p wasm` passes on native
- `wasm-pack test --node` passes on the WASM target
- `just wasm:check` is wired into `just quality`
- A deliberate spike: change the email regex in the wasm crate, verify both the server's tests fail AND (when the client is eventually built) the client's validation changes — same source, two runtimes

**Risk flags:**
- [MEDIUM RISK] `wasm-bindgen` + `tsify` interactions on complex return types can be finicky. Start with simple `fn(&str) -> bool` signatures and add richer return types only once the pipeline is proven.
- Build time increases because of the additional WASM target. Mitigate by caching `target/wasm32-unknown-unknown` aggressively in CI.

---

### Phase 4 — GraphQL Schema as Client-Type Source

**Goal:** The GraphQL schema is exported from `async-graphql` as `schema.graphql`, committed, and its freshness is enforced in CI. The client-side consumption of this schema is established as a pattern but remains out of scope for this spec.

**Components to build:**
- Add a new binary target in the gateway crate: `src/bin/export-schema.rs` that instantiates the GraphQL `Schema` and writes its SDL to stdout
- Add `just schema:export` — runs the binary, redirects to `gateway/schema.graphql`
- Run the export once; commit the resulting `schema.graphql`
- Add `just schema:check` — runs export to a temp file, diffs against committed, exits non-zero on drift
- Wire `schema:check` into `just quality` aggregate
- Document the expectation in the server README: "schema.graphql is a reviewed artifact; changes to it are API changes and deserve explicit review"

**Dependencies:** Phase 2 (entity types in GraphQL should be aligned with proto definitions via the domain conversion layer).

**Exit criteria:**
- `gateway/schema.graphql` exists, is committed, and matches what `just schema:export` produces fresh
- `just schema:check` passes with committed schema, fails if the committed version is stale (verified by a spike: make a resolver change without running export, confirm CI fails)
- The schema file contains the minimum GraphQL types needed to represent the entity set; no dead types
- Server README documents the workflow: add a resolver → `just schema:export` → commit both resolver and schema together

**Risk flags:**
- Low risk. `async-graphql` schema export is a mature feature and this is the simplest of the four phases.

---

### Phase 5 — Consolidation and Documentation

**Goal:** The four derivation layers are documented as a single coherent story, and the contributor workflow is clear.

**Components to build:**
- `src/server/ARCHITECTURE.md` — the four sources of truth, with one-paragraph explanations each and a link to the relevant files
- `src/server/CONTRIBUTING.md` — "if you're adding a field, here's what to change" (flowchart or decision tree)
- Rewrite `src/server/README.md` to point at the above
- Add the `just sync-check` aggregate command: runs `proto:check`, `wasm:check`, `schema:check`, `arch:check` in sequence
- Add a pre-commit hook (suggested, not mandatory) that runs `just sync-check --fast` as a cheap guard

**Dependencies:** Phases 1–4 complete.

**Exit criteria:**
- A new contributor can read `ARCHITECTURE.md` and `CONTRIBUTING.md` and understand where to add a field, what commands to run, and why
- `just sync-check` is the single command a developer runs before opening a PR and it gates CI
- Each of the four derivation layers has a one-page explanation in docs

**Risk flags:** Low — documentation phase.

---

## 7. Implementation Management

### 7.1 Sequencing & Critical Path

```
Phase 1 (schema scoping) ─────┐
                              ▼
Phase 2 (protobuf) ───────────┤
                              ▼
Phase 3 (wasm) ──── parallel with Phase 4 ──┐
                              │             │
                              ▼             ▼
Phase 4 (schema export) ─────────────────────┤
                                             ▼
                              Phase 5 (docs + sync-check)
```

Phase 1 is the critical gate. Everything downstream assumes the entity set is stable. Phase 2 is the highest-risk phase due to the protobuf-es version resolution needed first. Phases 3 and 4 are independent and can run in parallel if two engineers are available. Phase 5 is a finalizer.

Critical path for a single engineer: Phase 1 → Phase 2 → Phase 4 → Phase 3 → Phase 5. Reordering 3 and 4 is fine; 4 is smaller and gives a quick win after the heavy lift of Phase 2.

### 7.2 Ownership Suggestions

| Phase | Best Owner | Rationale |
|---|---|---|
| 1 | DB / platform engineer | Requires SurrealQL expertise; trim-and-verify work |
| 2 | Backend engineer with protobuf experience | Touches three languages' build pipelines |
| 3 | Rust engineer comfortable with the WASM ecosystem | `wasm-bindgen` and `tsify` have sharp edges |
| 4 | Backend engineer familiar with async-graphql | Single-crate change, moderate complexity |
| 5 | Technical writer or the engineer who did Phase 2 | Cross-cutting documentation |

Shared ownership of `proto/` is important: protobuf changes affect Rust, Go, and TS simultaneously, so any modification requires consensus from consumers of all three outputs.

### 7.3 Integration Points

- **Protobuf version alignment.** The existing v1/v2 mismatch (visible in the earlier test output showing `TypeError: Class extends value undefined is not a constructor`) must be resolved as a prerequisite to Phase 2. This is a blocker, not a nice-to-have.
- **Schema ↔ proto alignment.** When a field is added to the SurrealDB schema, the proto message must be updated in the same PR. CI cannot easily check this coupling automatically, so code review is the enforcement. Document the rule prominently.
- **Schema ↔ domain alignment.** When a domain entity's newtype invariants change (e.g., slug rules tighten), the WASM crate's `normalize_slug` must change too. These live in different crates but are semantically linked. Cross-reference them in comments.
- **WASM ↔ client build integration.** The WASM crate produces an artifact consumed by the client. Establishing the `wasm-pack build → client sdk/wasm/` flow happens at a server/client boundary; coordinate with whoever owns the client build.

### 7.4 Breaking Changes

| Decision | Reversal Cost | Mitigation |
|---|---|---|
| Proto as entity source of truth | Medium — reverting means hand-maintaining parallel structs again | Commit to the pattern; the investment pays off on the first real schema change |
| Committed generated files | Low — can switch to ignored + CI-generated later | Worth committing for now because diffs aid review |
| WASM crate as logic source | Medium — removing means re-splitting into server-only and client-only implementations | The conversion layer isolates the decision; rip out is mechanical if needed |
| Schema export committed | Low — trivially reversible by gitignoring | Keep for now; revisit if the file becomes unreadable |

None of these are one-way doors in the severe sense. Phase 2 is the closest to irreversible, because once the pipeline exists, hand-maintaining DTOs in three languages is clearly a regression.

---

## 8. Validation & Testing Strategy

### 8.1 Layer-by-Layer Verification

| Layer | Test Type | What It Verifies | Tool |
|---|---|---|---|
| SurrealDB schema | Inner-ring (Hurl) | Capability assertions, function behavior, event triggers | Hurl suite in `db/tests/` |
| Proto definitions | Build-time | `.proto` files are valid; regeneration produces stable output | `buf build` + `just proto:check` |
| Proto ↔ domain conversion | Unit tests | Round-trip for every entity preserves data | `cargo test -p gateway` |
| WASM crate (native) | Unit tests | Every exported function behaves per spec | `cargo test -p wasm` |
| WASM crate (browser) | Browser-target tests | Functions behave identically under wasm32 | `wasm-pack test --node` |
| GraphQL schema | Snapshot test | Committed `schema.graphql` matches fresh export | `just schema:check` |
| Full path (GraphQL → domain → DB) | Integration (Vitest) | End-to-end behavior through all layers | Existing `tests/integration/` suite |

### 8.2 Fitness Functions (The No-Duplication Enforcement)

The fitness functions are the soul of this spec. They are what turn "we agreed to have single sources of truth" into "the CI fails if we don't." Full list:

**`just proto:check`** — Runs `buf generate` and diffs against committed generated code. Fails if any generated file differs. Catches (a) forgotten regeneration after a `.proto` change and (b) hand-edits to generated files.

**`just wasm:check`** — Builds the wasm crate for both `--target native` and `--target wasm32-unknown-unknown`. Fails if either target fails to compile. Catches accidental introduction of non-WASM-compatible dependencies (async runtimes, native syscalls).

**`just schema:check`** — Runs the schema export binary, diffs against committed `schema.graphql`. Fails on drift. Catches forgotten export after resolver changes.

**`just arch:check`** — Parses every `Cargo.toml` in the workspace, verifies `domain` has no dependency on `store`, `application`, or `gateway`. Fails on any forbidden edge. Catches dependency-direction violations that would erode hexagonal architecture.

**`just sync-check`** — Aggregate command running all four of the above. Run locally before commit; run in CI as the first quality gate.

**`just audit`** (existing from parent spec) — Verifies `it.fails` test markers match `TODOS.md` entries. Existing fitness function, included in the aggregate.

### 8.3 Local Dev Validation

Before opening a PR, a developer runs:

```
just quality       # fmt + lint + typecheck across all components
just sync-check    # runs all four fitness functions
just test-triangle # full test suite (hurl + cargo + go + vitest)
```

All three must pass green. No exceptions, no "I'll fix it in follow-up" — drift introduced in a PR is drift that lands in main.

### 8.4 Observability Strategy (Derivation-Specific)

Derivation correctness is verified at build time, not runtime — there's nothing to observe in production for "did codegen run correctly." However, two production signals are worth tracking:

**Schema export freshness** — if the running server's introspected schema differs from the committed `schema.graphql` (e.g., because someone force-pushed past CI), emit a startup warning. Not a hard failure; a signal.

**WASM module version** — if the client is running a WASM blob compiled from a different source commit than the server, log a warning. Requires a build-stamp exported from both builds and compared at client init.

Neither of these is critical for initial delivery. Add them in Phase 5 if the team feels they add value; they're nice-to-have.

---

## 9. Open Questions & Risks

### 9.1 Unknowns

**[ASSUMPTION] Protobuf toolchain version alignment.** The test output showed a clear v1/v2 mismatch on the TypeScript side. This spec assumes that gets resolved as a prerequisite to Phase 2. If it doesn't, Phase 2 is blocked and the whole plan stalls. Resolving it is not this spec's concern, but it is on the critical path.

**[ASSUMPTION] `tsify` maturity.** The WASM crate's ability to export richly-typed structs to TypeScript depends on `tsify_next`. If it has limitations (enum support, generic handling), Phase 3 may need to constrain its own API surface to "pure primitives in, primitives out." That's actually fine for a template, but worth confirming with a spike before committing to broader use cases.

**[ASSUMPTION] `async-graphql` SDL export includes all necessary type details.** Enterprise GraphQL clients may require extensions (directives, federation markers) that `async-graphql` may or may not export cleanly. For the template's minimum use case, SDL export is sufficient. If the template grows toward federation, revisit.

### 9.2 External Dependencies Carrying Risk

| Dependency | Risk Level | Contingency |
|---|---|---|
| `buf` toolchain | Low | Industry standard with multiple alternative CLI implementations |
| `tonic-prost-build` | Low | Widely used in the Rust gRPC ecosystem |
| `wasm-bindgen` + `wasm-pack` | Low | Stable, well-maintained, the incumbent choice |
| `tsify_next` | Medium | Younger crate; if it stalls, fall back to hand-written TS type declarations for the WASM module |
| `async-graphql` SDL export | Low | Feature exists and is tested; risk is in edge cases |

### 9.3 Spike Recommendations

Before Phase 2 starts, run two short spikes to de-risk it:

1. **Resolve the protobuf-es version mismatch in isolation.** Pick a version (v1 *or* v2), align `buf.gen.yaml` and `package.json`, regenerate everything, and confirm the client builds. This must be green before Phase 2 begins proper.

2. **Write one `entities.proto` message and round-trip it through the conversion layer.** Use `Coordinates` as the simplest case (two floats). Verify the `From` impl roundtrips cleanly in a unit test. This proves the overall shape of Phase 2 in ~30 lines of code before committing to the full entity set.

Before Phase 3:

3. **Write a one-function WASM crate that exports `validate_email` and import it from both the gateway Rust code AND from a toy JS file via `wasm-pack test`.** This proves the dual-target build story before scaling it to the full validator/scorer set.

### 9.4 The Template's Honest Limits

Two things this architecture does not solve, and which should be documented as known limits rather than hidden:

**SurrealDB schema is not derivable from proto.** There is no automated flow from `entities.proto` to `DEFINE TABLE` / `DEFINE FIELD` statements. The two must be kept in sync manually, enforced by code review and Hurl tests that would fail if they drift. This is a real duplication and this spec acknowledges it. Building a proto-to-SurrealQL generator is a project unto itself, and for a template this size the cost exceeds the benefit. Someone forking may eventually want this; they'll know where to add it.

**Client-side TypeScript protobuf consumption is a parallel concern.** This spec's scope ends at generating `.pb.ts` files from `.proto`. Wiring those into `graphql-codegen`, consuming them in Svelte stores, and testing the client happy paths are all client concerns. They matter; they're just not this document's subject.

Accepting these limits is what keeps the spec honest. A template that claims to solve everything is a template that fails quietly in the places it oversold.

---

**End of Specification.**