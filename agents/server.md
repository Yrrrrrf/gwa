# Template Server — Unified Implementation Plan

**Date**: 2026-04-15
**Status**: Ready for execution
**Reference**: The Xibalbá project (`docs/ref/xibalbá/`) contains a working SurrealDB 3 implementation that validates every pattern used in this plan. When in doubt, check how Xibalbá does it — it compiles, seeds, and passes all tests.

---

## 0. Executive Summary

This plan builds the template's complete server: a SurrealDB 3 database showcasing every major feature (graph relations, events, functions, full-text search, geospatial, computed fields, permissions), a Rust engine that exposes it via GraphQL and connects to the Go sidecar via gRPC, and shell + Rust tests proving everything works end-to-end. The design philosophy is **"rich DB, lean Rust"** — SurrealDB handles graph traversals, search, aggregation, and side effects natively; the Rust engine handles authorization, transport (GraphQL/gRPC), and orchestration. The Rust domain layer does NOT mirror every DB table — it models only what the application needs to expose and manipulate. Every pattern in this plan has been proven in the Xibalbá reference implementation; there are zero unvalidated spikes.

---

## 1. Context & Constraints

### Project Context
- **Existing monorepo** with a working Rust engine (Axum 0.8 + async-graphql 8-rc + tonic 0.14), Go gRPC sidecar, SvelteKit client, proto contracts.
- **Rust engine compiles and runs** — GraphQL gateway, gRPC client, hexagonal architecture with domain/store/application/gateway crates.
- **DB is a placeholder** — has `todo.md` and basic test stubs, but no schema, no Dockerfile, no seed data.
- **Xibalbá reference exists** in the repo — a fully working SurrealDB 3 project with 12 tables, events, functions, geo, full-text search, graph traversal, and passing tests. This proves every SurrealDB 3 pattern we will use.

### Goals — What "Done" Looks Like
1. `podman-compose up` starts SurrealDB with a loaded schema and seed data.
2. `sh db/test/run-all.sh` passes — every DB feature verified independently.
3. `cargo test -p store` passes — Rust store repos talk to the live DB correctly.
4. `cargo run -p gateway` starts the server — GraphiQL at `/` serves real data from the seeded DB.
5. A GraphQL subscription on `items` fires when an item is created in Surrealist.
6. The Go gRPC sidecar starts and responds to `grpcurl` calls.
7. A developer who clones the repo can run `just dev` and have everything working in under 5 minutes.

### Team & Scale
- Solo developer. [ASSUMPTION]
- Template-level: tens of records, single SurrealDB instance, local development only.

### Architectural Rules
- **Lean Rust, rich DB**: The Rust engine exposes operations; SurrealDB provides the intelligence (graph, search, aggregation, events). The Rust domain layer does NOT need an entity and repo for every DB table.
- **Xibalbá patterns are canonical**: Event-based denormalization for cross-table aggregates. VALUE fields for same-record computations. Explicit graph traversal in functions (not COMPUTED `<~` bidirectional refs). Pipeline-ordered `.surql` files. Shell-based DB tests.
- **Hexagonal Rust**: `gateway → application → domain ← store`. No shortcuts.
- **Version contract**: axum 0.8, tonic 0.14, async-graphql 8-rc, prost 0.14, surrealdb 3.0. See `agents/specs/server.md` for the full version table.

### Out of Scope
- Client-side changes (SvelteKit).
- Go sidecar logic changes — it already works; we only verify connectivity.
- Production deployment, clustering, auth scopes at DB level.
- Vector search, ML features, temporal tables.

### Assumptions
- [ASSUMPTION] Xibalbá reference is available at `docs/ref/xibalbá/` or a known path in the repo for the implementing agent to read.
- [ASSUMPTION] The existing Rust entities (`Item`, `User`, `Session`) are close enough to the new DB schema that changes are additive (new fields), not rewrites.
- [ASSUMPTION] Docker/Podman is available via the Nix flake.
- [ASSUMPTION] Events fire during seed data loading (confirmed by Xibalbá: reviews created via RELATE trigger `on_review_created`, populating the `activity` table automatically).
- [ASSUMPTION] `geometry<point>` can be stored as `Option<serde_json::Value>` in Rust if the SDK's native geo type is awkward. The DB function `fn::items_near()` handles the geo math; the Rust side just passes coordinates through.

---

## 2. Architecture Overview

### The Three Layers

**Layer 1 — SurrealDB (The Intelligence)**: Handles schema enforcement (SCHEMAFULL, ASSERT), graph relations (TYPE RELATION), aggregation (events update denormalized stats), search (BM25 full-text), geospatial (geo::distance), and custom query functions. The DB is not just storage — it's a compute layer.

**Layer 2 — Rust Engine (The Gateway)**: Handles authorization (JWT), transport (GraphQL for clients, gRPC client for Go), and orchestration (use cases that combine repo calls). The domain layer defines entities and trait contracts. The store layer implements traits by calling SurrealDB (including calling `fn::` custom functions). The gateway exposes GraphQL and connects to Go via gRPC.

**Layer 3 — Go RPC (The Sidecar)**: Handles side-effect-heavy operations (notifications, document generation). Communicates with the Rust engine via gRPC. Exists as a prototyping plane — features validated here get promoted to Rust.

### System Diagram

```
         Clients
            │
        GraphQL
            │
  ┌─────────▼──────────┐
  │   RUST ENGINE       │
  │                     │
  │  GraphQL ← App ──┐ │
  │  (gateway) (use   │ │
  │             cases)│ │
  │                   │ │
  │  Domain (ports) ──┘ │
  │      ▲              │
  │  Store (repos) ─────┼──── SurrealDB
  │      │              │     (schema, events,
  │  gRPC Client ───────┼──── functions, graph)
  └──────┼──────────────┘
         │ gRPC
  ┌──────▼──────────┐
  │   GO SIDECAR    │
  │   (notify, docs)│
  └─────────────────┘

  Contracts: proto/template/v1/*.proto
  Reference: docs/ref/xibalbá/src/server/db/
```

### What the Rust Engine Owns vs. What the DB Owns

| Concern | Owner | Why |
|---|---|---|
| Schema enforcement (types, ASSERTs) | DB | Enforced regardless of which client connects |
| Graph traversal logic | DB (via `fn::` functions) | SurrealQL is purpose-built for this; doing it in Rust would be N+1 hell |
| Full-text search | DB (via `fn::` functions) | BM25 with custom analyzers — no reason to pull results to Rust and re-rank |
| Aggregate denormalization | DB (via events) | `on_comment_created` updates item stats atomically; no race conditions |
| Geo radius search | DB (via `fn::` functions) | `geo::distance()` is native; doing it in Rust means pulling all coordinates |
| Audit trail | DB (via events → `activity` table) | Side effect — the app shouldn't know or care |
| Auth (JWT validation) | Rust engine | The DB runs with root creds in dev; auth lives in the gateway |
| Business rule orchestration | Rust engine (application layer) | "Can this user delete this item?" is a domain decision, not a DB concern |
| Transport (GraphQL, gRPC) | Rust engine (gateway) | The DB has no knowledge of GraphQL or protobuf |
| Notifications | Go sidecar | Fire-and-forget async work; validated in Go, promoted to Rust later |

### Core Domain vs. Supporting

- **Core**: `user`, `item`, `comment` (graph edge), `likes` (graph edge) — these are what the template user will customize.
- **Supporting**: `tag` (taxonomy), `session` (auth infra), `activity` (audit — DB-internal, read-only from Rust).

---

## 3. Design Patterns & Code Standards

### 3.1 DB — Pipeline Pattern + Event-Driven Side Effects

- **Pattern**: Ordered Idempotent Pipeline (tables → fields → indexes → functions → events → seed) with Event-Driven Side Effects for denormalization and audit.
- **Why**: SurrealDB requires tables to exist before fields, fields before indexes. Events isolate side effects (updating item stats, writing audit records) from the main write path. This pattern is proven in Xibalbá — the init-db.sh walks directories in order, events fire on RELATE during seeding, activity records appear automatically.
- **How**: The `scripts/init-db.sh` script (copied from Xibalbá, updated for template namespace) iterates `init/01-schema/` through `init/05-seed/`, executing each `.surql` file. Events on `comment` and `likes` tables update denormalized fields on `item` and create `activity` records.
- **Standards**: File naming `NN-description.surql`. Every file starts with `USE NAMESPACE app; USE DATABASE main;` (except the first schema file which DEFINEs them). Comments explain which SurrealDB feature each block demonstrates.
- **At year 3/5/10**: This is how every database migration system works. The pattern outlives any specific SurrealDB version.

### 3.2 DB — Graph Edges as Tables

- **Pattern**: Edge-as-Table (SurrealDB native graph)
- **Why**: `comment` is both a relationship (user → item) and a record with data (rating, body). `likes` is a lightweight edge (user → item) with just a timestamp. Two different graph edge patterns, both demonstrated.
- **How**: `DEFINE TABLE comment SCHEMAFULL TYPE RELATION IN user OUT item`. Fields on the edge table are defined normally. Traversal uses `->comment->item` (forward) and `<-comment<-user` (reverse) in SurrealQL functions.
- **Standards**: Edge tables named as nouns/verbs describing the relationship. Always include at least a timestamp. Never manually define `in`/`out` fields — SurrealDB manages them.
- **At year 3/5/10**: This is SurrealDB's core differentiator. If it changes, SurrealDB itself has changed fundamentally.

### 3.3 DB — Denormalization via Events (Not COMPUTED)

- **Pattern**: Event-Based Denormalization (proven in Xibalbá)
- **Why**: Cross-table aggregates like "average rating of all comments on this item" could use COMPUTED fields (`COMPUTED math::mean(<-comment.rating)`), but Xibalbá proves that event-based updates are more reliable and performant. The event fires on comment CREATE/DELETE, recalculates the aggregate, and UPDATEs the item. The stored value is always fresh and O(1) to read.
- **How**: `DEFINE EVENT on_comment_created ON comment WHEN $event = 'CREATE'` triggers a block that recalculates `item.rating` and `item.comment_count` using `math::mean()` and `count()`, then UPDATEs the item record. A matching `on_comment_deleted` event handles the reverse.
- **Standards**: Events MUST NOT contain business logic. They handle only: aggregate recalculation and audit record creation. Event names follow `on_{table}_{action}`.
- **At year 3/5/10**: Event-driven denormalization is a universal pattern. Xibalbá proves it works in SurrealDB 3 today.

### 3.4 DB — Custom Functions for Complex Reads

- **Pattern**: Stored Read-Only Functions
- **Why**: Graph traversals and complex searches are too verbose to embed in every Rust store method. Wrapping them in `DEFINE FUNCTION` creates tested, named, reusable queries. The Rust store calls `fn::search_items($query, $limit)` and gets results — no SurrealQL expertise needed in the Rust layer.
- **How**: Four functions: `fn::search_items` (BM25 full-text), `fn::popular_items` (ranked by engagement), `fn::items_near` (geo radius), `fn::user_recommendations` (3-hop graph traversal for collaborative filtering — the "wow" function, directly ported from Xibalbá's `fn::tourist_recommendations`).
- **Standards**: Functions are SELECT-only, never mutate. Parameters are typed. Return shapes are documented. Xibalbá's `fn::tourist_recommendations` is the reference implementation for the graph traversal pattern.
- **At year 3/5/10**: Stored functions are a decades-old pattern. The SurrealQL syntax may evolve but the concept is timeless.

### 3.5 Rust — Lean Repository Pattern

- **Pattern**: Lean Repository (not 1:1 table mirroring)
- **Why**: The DB has 7 tables but the Rust engine doesn't need 7 entities with 7 repos. The `activity` table is DB-internal (written by events, read by admin queries). `tag` is simple enough to be a field on `item`. `comment` and `likes` are graph operations that can live as methods on `ItemRepository` rather than separate repos.
- **How**: Three Rust domain entities: `Item` (with optional tags, optional coordinates), `User`, `Session`. Two repo traits: `ItemRepository` (CRUD + subscribe + search + add_comment + toggle_like + recommendations), `AuthRepository` (user lookup, session management). The store layer implements these by calling SurrealDB queries and `fn::` functions. The gateway exposes them via GraphQL types.
- **Standards**: Every repo method returns domain types, never SurrealDB types. Complex read operations call the DB's custom functions rather than implementing the logic in Rust. The `ItemRepository` trait may have more methods than columns on the `item` table — that's fine; methods like `search()` or `recommendations()` delegate to DB functions.
- **At year 3/5/10**: At year 3, you might split `ItemRepository` into `ItemReadRepo` and `ItemWriteRepo` if it grows too large. At year 5, promoted Go services get their own repos. The lean approach prevents premature abstraction while keeping the door open.

### 3.6 Rust — BFF Gateway Pattern (Existing)

- **Pattern**: Backend for Frontend via GraphQL (already in place)
- **Why**: GraphQL resolvers are thin: extract context, call use case, return result. The schema is the client contract. Subscriptions feed from the store's `subscribe()` method (live queries).
- **How**: Already implemented — `Query`, `Mutation`, `Subscription` root types delegate to `application` use cases. New resolvers for comments, likes, search, and recommendations will follow the same pattern.
- **Standards**: Resolvers MUST NOT contain business logic. New GraphQL types (`CommentType`, `TagType`) are lightweight — they convert from domain types via `From` implementations. Auth guards protect mutations.
- **At year 3/5/10**: GraphQL is 12+ years old and stable. The async-graphql 8-rc is the only short-shelf-life component — when it stabilizes, pin the stable version.

### Cross-Cutting Standards

- **DB naming**: Tables singular lowercase (`item`, `comment`), fields `snake_case`, functions `fn::snake_case`, events `on_{table}_{action}`, indexes `{table}_{fields}_{type}`.
- **Rust naming**: Standard Rust conventions. Domain entities are `PascalCase` structs. Repo traits use `async fn` returning `Result<T, DomainError>`.
- **Record IDs**: Seed data uses human-readable IDs (`user:alice`, `item:hiking_boots`) for test clarity. Production uses SurrealDB's auto-generated ULIDs.
- **Timestamps**: Every mutable table has `created_at` (immutable, DEFAULT time::now()) and `updated_at` (VALUE time::now(), recalculated on write). Follows Xibalbá's pattern.

---

## 4. Component Map & Directory Structure

### 4.1 Database (`src/server/db/`)

- **Responsibility**: Schema, seed data, functions, events, tests. The "intelligence layer."
- **Interfaces**: SurrealQL tables and functions callable from the Rust store via the SurrealDB SDK.
- **Dependencies**: SurrealDB v3 binary (Docker image).
- **What it must NOT do**: Must not contain application-level business logic. Events handle side effects only.
- **Reference**: Copy structure from `docs/ref/xibalbá/src/server/db/`. Adapt Dockerfile, scripts, init pipeline. Replace tourism entities with generic template entities.

### 4.2 Rust Domain (`engine/core/domain/`)

- **Responsibility**: Entity definitions, repository trait declarations, domain errors. Pure business rules.
- **Interfaces**: `Item` (id, title, description, status, tags as Vec<String>, coordinates as Option, rating as Option<f64>, comment_count as Option<i64>, timestamps), `User`, `Session`, `Comment` (lightweight struct for read results), `ItemEvent`.
- **Dependencies**: Only serde, chrono, async-trait, futures-util.
- **What it must NOT do**: Must never import surrealdb, axum, async-graphql, tonic. Must never reference DB-specific concepts (record IDs with colons, SurrealDB Value types).

### 4.3 Rust Store (`engine/core/store/`)

- **Responsibility**: SurrealDB implementations of domain repo traits. Calls `fn::` custom functions for complex reads. Provides live query streams for subscriptions.
- **Interfaces**: `SurrealItemRepo` implementing `ItemRepository`, `SurrealAuthRepo` implementing `AuthRepository`.
- **Dependencies**: domain + surrealdb.
- **What it must NOT do**: Must not contain business logic. Must not reference GraphQL or transport types.

### 4.4 Rust Application (`engine/application/`)

- **Responsibility**: Transport-agnostic use cases. Orchestrates domain logic.
- **Interfaces**: `login()`, `list_items()`, `get_item()`, `create_item()`, `delete_item()`, `search_items()`, `add_comment()`, `toggle_like()`, `get_recommendations()`.
- **Dependencies**: domain only.
- **What it must NOT do**: Must not import async-graphql, tonic, axum, surrealdb.

### 4.5 Rust Gateway (`engine/services/gateway/`)

- **Responsibility**: Axum HTTP server mounting GraphQL + GraphiQL. gRPC client wrappers for Go sidecar. Auth middleware.
- **Interfaces**: POST `/graphql`, GET `/graphql/ws` (subscriptions), GET `/` (playground).
- **Dependencies**: All Rust crates + async-graphql + tonic + axum.
- **What it must NOT do**: Must not contain business logic in resolvers. Must not write SurrealQL directly.

### 4.6 Go Sidecar (`src/server/rpc/`)

- **Responsibility**: gRPC services for notifications and document generation. Already working — this plan only verifies connectivity.
- **What it must NOT do**: Must not expose HTTP/REST. Must not write directly to the DB.

### Full Directory Tree

```
src/server/
├── db/
│   ├── db.Dockerfile                      # FROM surrealdb/surrealdb:v3 (copy from Xibalbá)
│   ├── scripts/
│   │   ├── entrypoint.sh                  # Start SurrealDB, run init-db.sh (copy from Xibalbá)
│   │   └── init-db.sh                     # Walk init/ dirs in order (copy from Xibalbá)
│   ├── init/
│   │   ├── 01-schema/
│   │   │   ├── 01-tables.surql            # 7 tables: user, session, item, tag, comment, likes, activity
│   │   │   └── 02-fields.surql            # All fields with ASSERTs, VALUE, REFERENCE, PERMISSIONS
│   │   ├── 02-indexes/
│   │   │   └── 01-indexes.surql           # UNIQUE, BM25 full-text, composite unique on comment
│   │   ├── 03-functions/
│   │   │   └── 01-functions.surql         # fn::search_items, fn::popular_items, fn::items_near, fn::user_recommendations
│   │   ├── 04-events/
│   │   │   └── 01-events.surql            # on_comment_created, on_comment_deleted, on_item_liked
│   │   └── 05-seed/
│   │       ├── 01-tags.surql              # 5-6 tags: tech, travel, food, music, sports, gaming
│   │       ├── 02-users.surql             # 4 users: alice (admin), bob (owner), carol (user), dave (user)
│   │       ├── 03-items.surql             # 6-8 items with tags, coordinates, varied statuses
│   │       ├── 04-comments.surql          # 10+ RELATE user→comment→item with ratings 1-5
│   │       └── 05-likes.surql             # 15+ RELATE user→likes→item (enough overlap for recommendations)
│   └── test/
│       ├── fixtures.sh                    # Copy from Xibalbá, update namespace
│       ├── run-all.sh                     # Copy from Xibalbá
│       ├── unit/
│       │   └── 01-schema.sh               # ASSERT violations, UNIQUE violations
│       ├── integration/
│       │   ├── 01-computed.sh             # Event-denormalized stats are correct
│       │   ├── 02-events.sh               # Creating comment → activity record appears
│       │   ├── 03-graph.sh                # Forward/reverse traversal, fn::user_recommendations
│       │   └── 04-functions.sh            # fn::search_items, fn::items_near, fn::popular_items
│       └── e2e/
│           └── 01-smoke.sh                # Full-text search, seed counts, geo radius, reference integrity
│
├── engine/                                # Rust workspace (already exists)
│   ├── core/domain/src/entities/
│   │   ├── item.rs                        # ADD: tags, coordinates, rating, comment_count fields
│   │   ├── user.rs                        # UNCHANGED
│   │   └── comment.rs                     # NEW: lightweight Comment struct for read results
│   ├── core/domain/src/ports/
│   │   └── item.rs                        # ADD: search(), add_comment(), toggle_like(), recommendations() methods
│   ├── core/store/src/repos/
│   │   └── item.rs                        # ADD: implementations calling fn:: functions
│   ├── application/src/use_cases/
│   │   └── items.rs                       # ADD: search_items(), add_comment(), toggle_like(), get_recommendations()
│   └── services/gateway/src/adapters/graphql/
│       ├── query.rs                       # ADD: searchItems, popularItems, recommendations resolvers
│       ├── mutation.rs                    # ADD: addComment, toggleLike resolvers
│       └── types/
│           ├── item.rs                    # ADD: tags, coordinates, rating, commentCount fields
│           └── comment.rs                 # NEW: CommentType, AddCommentInput
│
├── proto/                                 # UNCHANGED — already working
├── rpc/                                   # UNCHANGED — already working
└── docker-compose.yml                     # UPDATE: add db service using db/db.Dockerfile
```

---

## 5. Trade-off Analysis

### 5.1 Rust Entity Granularity

```
DECISION: How many Rust domain entities to create for 7 DB tables

OPTIONS CONSIDERED:
  A. Full mirror (7 entities, 7 repos) — Pros: symmetry, every table is
     a first-class citizen. Cons: ceremony overhead. activity is write-only
     from events. tag is a flat lookup. likes is a boolean toggle.
     Most of these repos would have 1-2 methods.
  B. Lean (3 entities, 2 repos + extended methods) — Pros: less code,
     less abstraction. Item repo gains search/comment/like methods that
     delegate to DB functions. Cons: ItemRepository trait grows large.
  C. Hybrid (4 entities, 3 repos) — Pros: Comment gets its own type
     (needed for GraphQL) but shares ItemRepository. Tag is a simple
     type embedded in Item. Activity is read-only, accessed via a
     query method. Cons: slight asymmetry.

CHOSEN: C — Hybrid (Item, User, Session, Comment as types; ItemRepo, AuthRepo as traits)

REASON: Comment needs its own Rust struct because GraphQL returns it as a
nested type under Item. But it doesn't need its own repo — "add comment"
and "list comments" are operations ON an item, not on a standalone entity.
Tag is even simpler — it's a Vec<String> on Item in the Rust layer, backed
by a proper tag table in the DB. Activity is never written by Rust, only
read for admin queries — a single query method suffices.

REVISIT IF: The template adds user profiles with activity feeds, at which
point Activity might deserve its own entity and repo.
```

### 5.2 How the Store Calls DB Functions

```
DECISION: How the Rust store layer invokes SurrealDB custom functions

OPTIONS CONSIDERED:
  A. Raw SurrealQL strings — db.query("RETURN fn::search_items($query, $limit)")
     with bound params. Pros: direct, no abstraction. Cons: stringly-typed,
     no compile-time safety on function names.
  B. Wrapper methods with typed params — store method search_items(query: &str,
     limit: i32) internally calls the raw query but exposes a clean Rust API.
     Pros: type safety at the Rust boundary, SurrealQL stays in the store layer.
     Cons: one more method per function.
  C. Code-generated function stubs — Pros: automatic. Cons: no such tool exists
     for SurrealDB functions. Overengineered.

CHOSEN: B — Wrapper methods

REASON: The store layer's job is to translate between Rust types and DB queries.
A method like search_items(&self, query: &str, limit: i32) -> DomainResult<Vec<Item>>
encapsulates the SurrealQL call, deserializes the result into domain types, and
maps errors to DomainError. The raw SurrealQL string lives inside ONE method in
ONE file — easy to update if the function signature changes.

REVISIT IF: SurrealDB releases a Rust SDK with first-class function call support
(typed bindings), at which point wrapper methods become unnecessary.
```

### 5.3 Geospatial in the Rust Layer

```
DECISION: How to represent geometry<point> in Rust domain entities

OPTIONS CONSIDERED:
  A. Native geo type from surrealdb SDK — Pros: type-safe. Cons: couples domain
     to surrealdb crate, geo type may be awkward to serialize to GraphQL.
  B. Custom Coordinates struct { lat: f64, lng: f64 } — Pros: clean, domain-native,
     easy to serialize. Cons: needs manual conversion from SurrealDB's GeoJSON.
  C. Option<serde_json::Value> — Pros: zero conversion, pass-through. Cons: no
     type safety, consumers must parse the JSON themselves.

CHOSEN: B — Custom Coordinates struct

REASON: The domain should express its own types. A Coordinates { lat, lng } struct
is universally understandable, serializes cleanly to GraphQL, and converts easily
from SurrealDB's GeoJSON (which is {type:"Point", coordinates:[lng, lat]}). The
store layer handles the conversion. The fn::items_near function in the DB handles
the actual geo math — the Rust layer just passes the point through.

REVISIT IF: The surrealdb Rust SDK adds a clean, serde-friendly geo type.
```

### 5.4 Comment as Graph vs. Regular Table in Rust

```
DECISION: How the Rust layer models comments (which are graph edges in the DB)

OPTIONS CONSIDERED:
  A. Graph-aware — Rust knows about in/out record IDs, exposes the graph edge
     as a first-class concept. Pros: symmetry with DB. Cons: couples Rust
     domain to SurrealDB's graph model.
  B. Flat struct — Comment has user_id, item_id, rating, body, created_at.
     The fact that it's a graph edge in the DB is a persistence detail.
     Pros: domain stays pure, GraphQL type is straightforward. Cons: loses
     the graph semantics at the Rust level.

CHOSEN: B — Flat struct

REASON: The domain layer should not know that comments are implemented as
graph edges. "A comment belongs to a user and an item" is expressible without
graph concepts. The store layer maps SurrealDB's in/out fields to user_id/item_id.
Graph traversals (like "find items this user commented on") are handled by
DB functions, not by Rust code walking edges.

REVISIT IF: The template adds multi-hop graph queries that need to be composed
in Rust rather than in SurrealQL.
```

### 5.5 Deployment Model

```
DECISION: How db + engine + rpc run together in development

OPTIONS CONSIDERED:
  A. Full Docker Compose — all three in containers. Pros: isolated.
     Cons: slow rebuild on code changes.
  B. Docker for DB + local processes for engine/rpc — Pros: fast iteration,
     cargo watch / go run directly. Cons: need to manage DB connectivity.
  C. All local — surreal CLI + cargo run + go run. Pros: fastest.
     Cons: no container parity, SurrealDB version drift.

CHOSEN: B — Docker for DB, local for Rust/Go

REASON: The DB schema rarely changes during development. The Rust engine
and Go sidecar change constantly. Docker Compose runs SurrealDB with the
schema loaded; cargo run and go run connect to localhost:8000. The
docker-compose.yml defines the db service with the db.Dockerfile. The
just tasks orchestrate startup.

REVISIT IF: Team grows and "works on my machine" becomes a problem.
```

---

## 6. Phased Implementation Plan

### Phase 1 — Database: Schema, Seed & Tests

- **Goal**: A complete, working SurrealDB with schema, seed data, and passing tests. The foundation everything else builds on.
- **Components to build**:
  1. Copy `db.Dockerfile`, `scripts/entrypoint.sh`, `scripts/init-db.sh` from Xibalbá reference. Update namespace comments from "Xibalbá" to "Template."
  2. Write `init/01-schema/01-tables.surql` — define 7 tables. Reference Xibalbá's tables file for the TYPE RELATION and PERMISSIONS syntax.
  3. Write `init/01-schema/02-fields.surql` — all fields. Reference Xibalbá's fields file for ASSERT, VALUE, REFERENCE patterns. Key differences from Xibalbá: `item` replaces `business`, `comment` replaces `review`, `likes` replaces `favorites`, no `city`/`locale_string`/`media`/`manages`/`visits`.
  4. Write `init/02-indexes/01-indexes.surql` — unique indexes, BM25 analyzer + full-text indexes on item.title and item.description. Reference Xibalbá's `ascii_bm25` analyzer.
  5. Write `init/03-functions/01-functions.surql` — four functions. Port `fn::tourist_recommendations` → `fn::user_recommendations` (change `visits` → `likes`, `business` → `item`). Port `fn::search_businesses` → `fn::search_items`. Port `fn::businesses_near` → `fn::items_near`. Write `fn::popular_items` (simpler than Xibalbá's `fn::popular_in_city` since no city filter).
  6. Write `init/04-events/01-events.surql` — port Xibalbá's `on_review_created`/`on_review_deleted` → `on_comment_created`/`on_comment_deleted` (same pattern: recalculate stats + write activity).
  7. Write seed files with human-readable IDs. Design the likes matrix carefully so `fn::user_recommendations` returns non-empty results (need at least 2 users sharing 3+ liked items).
  8. Copy test infrastructure (`fixtures.sh`, `run-all.sh`) from Xibalbá. Write tests for: schema constraints (unit), denormalized stats + events + graph traversal + functions (integration), full-text search + seed counts + geo + references (e2e).
  9. Add `db` service to `docker-compose.yml`.
- **Dependencies**: Docker/Podman available.
- **Exit criteria**: `podman-compose up db` starts SurrealDB and loads schema without errors. `sh db/test/run-all.sh` passes ALL tests. Querying `RETURN fn::user_recommendations(user:carol, 3)` returns non-empty results.
- **Risk flags**: None — every pattern is proven in Xibalbá. The risk is only in typos and seed data design (the likes matrix).

### Phase 2 — Rust Store: Domain Alignment & Repo Methods

- **Goal**: The Rust domain entities align with the DB schema. Store repos can CRUD items and call every DB function. `cargo test -p store` passes against the live DB.
- **Components to build**:
  1. Update `domain/src/entities/item.rs` — add `tags: Vec<String>`, `coordinates: Option<Coordinates>`, `rating: Option<f64>`, `comment_count: Option<i64>`. Add `Coordinates { lat: f64, lng: f64 }` struct. These new fields are all `Option` or `Vec` so existing code doesn't break.
  2. Add `domain/src/entities/comment.rs` — lightweight struct: `id: String`, `user_id: String`, `item_id: String`, `rating: i32`, `body: Option<String>`, `created_at: DateTime<Utc>`.
  3. Expand `domain/src/ports/item.rs` — add methods to `ItemRepository` trait: `search(query: &str, limit: i32)`, `add_comment(user_id: &str, item_id: &str, rating: i32, body: Option<String>)`, `toggle_like(user_id: &str, item_id: &str)`, `recommendations(user_id: &str, limit: i32)`, `items_near(lat: f64, lng: f64, radius_km: f64)`, `popular(limit: i32)`, `comments_for_item(item_id: &str)`.
  4. Implement all new methods in `store/src/repos/item.rs`. For search/recommendations/popular/items_near, call the corresponding `fn::` functions via `db.query("RETURN fn::...()")`. For add_comment, use `RELATE $user->comment->$item SET rating = $rating, body = $body`. For toggle_like, check existence and CREATE or DELETE accordingly.
  5. Handle `Coordinates` ↔ SurrealDB `geometry<point>` conversion in the store layer. SurrealDB returns `{type: "Point", coordinates: [lng, lat]}` — the store maps this to/from `Coordinates { lat, lng }`.
  6. Update `store/src/tests.rs` — add tests for the new methods. Especially: create an item with coordinates, search for it, add a comment, verify stats updated, toggle a like, call recommendations.
- **Dependencies**: Phase 1 (DB must be running with seed data).
- **Exit criteria**: `cargo test -p store -- --test-threads=1` passes all tests against the live DB.
- **Risk flags**: [MEDIUM RISK] Deserialization of fields that are populated by events (like `rating`, `comment_count`) — if the event hasn't fired yet (e.g., during a test that creates an item without comments), these fields may be `null` in the DB. The Rust entity MUST use `Option<f64>` / `Option<i64>` for these, not bare `f64` / `i64`.

### Phase 3 — Rust Application & Gateway: New Use Cases & GraphQL

- **Goal**: The GraphQL API exposes search, comments, likes, and recommendations. GraphiQL serves real data with full functionality.
- **Components to build**:
  1. Add use cases to `application/src/use_cases/items.rs`: `search_items()`, `add_comment()`, `toggle_like()`, `get_recommendations()`, `get_popular()`, `get_items_near()`, `get_comments()`. Each calls the corresponding repo method.
  2. Add `CommentType`, `AddCommentInput` to `gateway/src/adapters/graphql/types/`.
  3. Update `query.rs` — add `searchItems(query, limit)`, `popularItems(limit)`, `recommendations(userId, limit)`, `itemsNear(lat, lng, radiusKm)` resolvers.
  4. Update `mutation.rs` — add `addComment(input)` and `toggleLike(itemId)` resolvers. `addComment` requires auth (use existing guard). `toggleLike` requires auth.
  5. Update `ItemType` — add `tags`, `rating`, `commentCount`, `coordinates` fields. Add a `comments` field that resolves by calling `get_comments(item.id)` (this is where a DataLoader would optimize, but a simple nested resolver is fine for the template).
  6. Verify subscriptions still work — the `subscribe()` method on `ItemRepository` returns a live query stream on the `item` table. When events update item stats (rating, comment_count), the live query should fire because the stored record is being UPDATEd by the event.
- **Dependencies**: Phase 2 (store repos must work).
- **Exit criteria**: Start the gateway with `cargo run -p gateway`. Open GraphiQL. Run `{ searchItems(query: "hiking", limit: 5) { id title rating } }` — returns results. Run `mutation { addComment(input: { itemId: "item:hiking_boots", rating: 5, body: "Great!" }) { id rating } }` — works with auth token. Run `{ recommendations(userId: "user:carol", limit: 3) { id title } }` — returns non-empty.
- **Risk flags**: None significant — this is standard resolver wiring. The hard work (DB functions, store methods) is done in Phases 1–2.

### Phase 4 — Integration Verification & Polish

- **Goal**: Everything works together. Docker Compose starts the full stack. Documentation is updated.
- **Components to build**:
  1. Verify `docker-compose.yml` starts db + engine + rpc. The engine connects to the DB at `ws://db:8000`. The engine connects to the Go sidecar at `http://rpc:4000`.
  2. Add `just db test` task that runs `sh db/test/run-all.sh`.
  3. Add `just db reload` task that re-runs `init-db.sh` against a live DB instance.
  4. Verify `just server test` runs both DB shell tests and `cargo test -p store`.
  5. Update `README.md` with the new data model, getting started instructions, and a "SurrealDB features" section listing what each DB element demonstrates.
  6. Update `agents/instructions.md` with the new schema and architectural mandates.
  7. Clean up any TODO comments from the migration.
- **Dependencies**: Phases 1–3.
- **Exit criteria**: A developer clones the repo, runs `nix develop`, then `just dev`, and has the full stack running. GraphiQL is accessible. `just server test` passes. The README explains everything.
- **Risk flags**: None — this is polish.

---

## 7. Implementation Management

### Sequencing

```
Phase 1: Database ──► Phase 2: Rust Store ──► Phase 3: GraphQL ──► Phase 4: Polish
                              │
                              └── (db must be running for store tests)
```

Strictly sequential. Each phase is 2–4 hours of work. Total estimate: 8–16 hours.

### Critical Path

```
02-fields.surql → fn:: functions → store repo methods → GraphQL resolvers
```

The fields file defines every name and type. Everything downstream depends on it. Get it right first — reference Xibalbá's `02-fields.surql` for every pattern.

### Integration Points

1. **DB field names ↔ Rust struct fields**: Must match exactly (snake_case). SurrealDB returns `comment_count`; the Rust `Item` struct must have `comment_count: Option<i64>`. Mismatches cause silent deserialization failures. Verify with a test after Phase 2.

2. **Event-populated fields**: `item.rating` and `item.comment_count` are populated by the `on_comment_created` event. When an item has zero comments, these fields are their DEFAULT value (0 or NONE). The Rust entity must handle both states.

3. **Graph edge deserialization**: When the store calls `SELECT * FROM comment WHERE out = $item_id`, SurrealDB returns records with `in` (user record ID) and `out` (item record ID) fields. The store must map `in` → `user_id` and `out` → `item_id` in the Rust `Comment` struct. Use serde rename or manual extraction.

4. **fn:: function return shapes**: Each function returns a specific shape. The store must deserialize this into domain types. Test each function call individually in Phase 2.

### Breaking Changes

- [HIGH RISK] **Adding fields to `Item` entity**: Existing code that constructs `Item` structs (in `use_cases/items.rs`, in `store` tests) must include the new fields. Use `Default` or explicit `None`/empty values.
- [MEDIUM RISK] **Expanding `ItemRepository` trait**: Adding methods to the trait means the `SurrealItemRepo` must implement them. If any method is missing, `cargo check` fails. Implement all methods before running check.

---

## 8. Validation & Testing Strategy

### Test Matrix

| Layer | Test Type | What it verifies | How to run |
|---|---|---|---|
| DB schema | Unit (shell) | ASSERTs reject bad data, UNIQUE indexes prevent duplicates | `sh db/test/unit/01-schema.sh` |
| DB events | Integration (shell) | Creating comment → item stats updated + activity written | `sh db/test/integration/02-events.sh` |
| DB functions | Integration (shell) | search, recommendations, geo, popular return correct results | `sh db/test/integration/04-functions.sh` |
| DB graph | Integration (shell) | Forward/reverse traversal, recommendations graph | `sh db/test/integration/03-graph.sh` |
| DB references | Integration (shell) | CASCADE deletes propagate, tagged items prevent tag deletion | `sh db/test/e2e/01-smoke.sh` |
| Rust store | Integration (Rust) | CRUD + fn:: calls + live queries against live DB | `cargo test -p store -- --test-threads=1` |
| GraphQL | Manual | Resolvers return correct shapes from real DB | GraphiQL playground |
| Full stack | E2E | docker-compose starts everything, GraphQL query returns data | `just dev` + curl a query |

### Architecture Fitness Functions

1. **Domain purity**: CI checks `domain/Cargo.toml` — fails if surrealdb, axum, async-graphql, or tonic appear.
2. **Application isolation**: CI checks `application/Cargo.toml` — fails if any transport/infra crate appears.
3. **DB pipeline order**: Every `.surql` file in `init/` is in a correctly numbered directory.
4. **Seed completeness**: The e2e smoke test verifies minimum record counts per table.

### Local Dev Validation

1. `podman-compose up db` → DB starts, schema loads.
2. `sh db/test/run-all.sh` → all DB tests pass.
3. `cargo test -p store -- --test-threads=1` → Rust store tests pass.
4. `cargo run -p gateway` → server starts, GraphiQL works.
5. `grpcurl -plaintext localhost:4000 list` → Go sidecar responds.

### Observability
- `activity` table IS the audit trail — written by DB events, queryable by admin.
- Rust engine uses `tracing` for structured logging.
- Go sidecar uses `slog` with lipgloss pretty handler.

---

## 9. Open Questions & Risks

### Open Questions

1. **`Option` vs. default values for event-populated fields**: When an item has zero comments, does SurrealDB return `rating: 0` (because of `DEFAULT 0`) or `rating: null`? If it's `0`, the Rust field can be `f64`. If it's `null`, it must be `Option<f64>`. Test this in Phase 1 by querying a freshly seeded item with no comments. [LOW RISK — easy to adjust]

2. **Live query trigger on event UPDATE**: When `on_comment_created` runs `UPDATE $item SET rating = ...`, does the live query on the `item` table fire? It should — the event UPDATEs the stored record, which is a change. Xibalbá doesn't test this specific scenario but the mechanism is standard SurrealDB. Verify in Phase 2. [LOW RISK]

3. **`serde` mapping for graph edge `in`/`out` fields**: SurrealDB returns `in` and `out` as record link values (e.g., `user:carol`). Does `serde_json` deserialize these as strings, or as structured objects? The Xibalbá store repos handle this for `review` edges — reference that code. [LOW RISK — known pattern]

### Risks

1. **[LOW RISK] async-graphql 8-rc stability**: The `8.0.0-rc.4` release may have bugs or API changes before stable release. Mitigation: pin the exact rc version. When stable 8.0 releases, upgrade and fix any breaking changes (likely minor).

2. **[LOW RISK] Seed data matrix for recommendations**: `fn::user_recommendations` needs enough overlapping likes to produce results. With 4 users and 6-8 items, this requires careful seed design. Mitigation: plan the likes matrix on paper before writing the `.surql` file. Ensure at least 2 users share 3+ liked items, and at least 1 user has items NOT liked by the others (those become recommendations).

3. **[ZERO RISK] DB patterns**: Every pattern in this plan (events, functions, graph, full-text, geo, pipeline) is proven in the Xibalbá reference with passing tests. There are no unvalidated spikes.