# Template Genericization — Architectural Spec Plan
> Generated via `architect-spec-planner` · April 2026

---

## 0. Executive Summary

This plan governs the transformation of an existing food/restaurant discovery monorepo into a **clean, domain-agnostic starter template** that demonstrates the full architectural pattern of the stack (SvelteKit + Deno SDK, Rust Hexagonal Engine, Go RPC service, Tauri desktop app) without carrying any business-domain baggage. The result will be a single reference template a developer can clone, understand in under an hour, and build any domain on top of. The architecture stays identical — only the domain vocabulary changes. This is a strong long-term bet because the structural patterns (Hexagonal backend, SDK-driven frontend, shared UI primitives) are technology-agnostic and will remain relevant for years regardless of what domain gets layered on.

---

## 1. Context & Constraints

### Project Context
- **Type:** Existing monorepo refactor — no new features, no greenfield decisions
- **Monorepo layout:** `template/src/client/` (Deno + SvelteKit) + `template/src/server/` (Rust engine + Go RPC + PostgreSQL)
- **Stack:** SvelteKit 5 (Svelte Runes), Deno workspaces, Tauri v2 (explorer app), Rust (Axum + Hexagonal), Go (HTTP/RPC + Typst), PostgreSQL, Docker Compose, Nix flakes, Traefik, Just task runner

### Goals — Definition of "Done"
1. Zero files reference food, restaurant, dish, merchant, visitor, geo/map, or real-estate domain concepts
2. Every structural layer (entity → store → UI → route → API → use-case → repo → DB) has exactly **one working generic `Item` example** end-to-end
3. Auth (`User`) remains intact — it is domain-agnostic infrastructure
4. The `explorer` Tauri app is preserved and functional
5. The `vision` dev-showcase app is preserved but its showcase tabs reference `Item`, not food concepts
6. A new developer can read the template and understand the full data-flow in < 1 hour

### Architectural Rules (must not violate)
- Hexagonal / Ports & Adapters pattern in the Rust engine is **non-negotiable**
- SDK package boundaries (`core` / `state` / `ui`) must remain separate workspaces
- Tauri `explorer` app stays — it is part of the template's demonstrated surface area
- No new libraries may be introduced during the refactor

### Out of Scope
- New features of any kind
- Database migrations (schema refactor is out of scope — DB is treated as a stub/seed)
- CI pipeline changes beyond renaming env vars
- Performance optimization

### Assumptions
- [ASSUMPTION] The PostgreSQL schema contains domain tables (businesses, dishes, reviews, etc.) — these will be replaced with a single generic `items` table stub, but the full migration is out of scope
- [ASSUMPTION] The `rpc/templates/` Typst files are used for document generation in the running app — they will be reduced to a single generic stub, not deleted entirely
- [ASSUMPTION] `sdk/ui/constants/categories.ts` and `utils/category-colors.ts` are consumed by discover/merchant components only — safe to remove with those components
- [ASSUMPTION] `leaflet-icons.ts` has zero consumers outside the `discover/` component folder

---

## 2. Architecture Overview

### System Layers

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT MONOREPO                      │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  apps/vision │  │ apps/explorer│  │  sdk/ui       │  │
│  │  (dev lab)   │  │ (Tauri app)  │  │  (components) │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         └────────────┬────┘                 │           │
│                      ▼                      │           │
│              ┌──────────────┐               │           │
│              │  sdk/state   │◄──────────────┘           │
│              │  (stores)    │                           │
│              └──────┬───────┘                           │
│                     ▼                                   │
│              ┌──────────────┐                           │
│              │  sdk/core    │                           │
│              │  (entities,  │                           │
│              │   types)     │                           │
│              └──────┬───────┘                           │
└─────────────────────┼───────────────────────────────────┘
                      │ HTTP/JSON
┌─────────────────────▼───────────────────────────────────┐
│                  SERVER MONOREPO                         │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │               engine/services/api (Rust/Axum)    │   │
│  │  routes → use_cases → ports (domain interfaces)  │   │
│  └──────────────────────────┬───────────────────────┘   │
│                             │                           │
│  ┌──────────────────────────▼───────────────────────┐   │
│  │            engine/core/domain (pure Rust)        │   │
│  │            entities + ports (traits)             │   │
│  └──────────────────────────┬───────────────────────┘   │
│                             │                           │
│  ┌──────────────────────────▼───────────────────────┐   │
│  │            engine/core/store (PostgreSQL)        │   │
│  │            repos implementing domain ports       │   │
│  └──────────────────────────┬───────────────────────┘   │
│                             │                           │
│  ┌──────────────────────────▼───────────────────────┐   │
│  │         server/rpc (Go — email/doc generation)   │   │
│  └──────────────────────────┬───────────────────────┘   │
│                             │                           │
│                    ┌────────▼────────┐                  │
│                    │   PostgreSQL    │                  │
│                    └─────────────────┘                  │
└─────────────────────────────────────────────────────────┘
```

### Core Domain vs. Supporting Domains
- **Core domain (keep):** `Item` + `User` — one generic CRUD entity plus auth
- **Supporting infrastructure (keep):** auth, middleware, layout, primitives, i18n scaffold, Typst base styles
- **Removed supporting domains:** food, geo, real-estate — all evicted

---

## 3. Design Patterns & Code Standards

### 3.1 Rust Engine — Hexagonal Architecture (Ports & Adapters)

**Pattern:** Hexagonal / Ports & Adapters with a clean domain layer

**Why this pattern:** The domain layer (`engine/core/domain`) owns zero infrastructure knowledge. It defines traits (ports) that the database layer (`engine/core/store`) implements. At year 3, you can swap PostgreSQL for a different store without touching a single business rule. At year 10, you can add an event-sourcing layer behind the same ports.

**How it's applied:**
- `domain/entities/` contains pure Rust structs with no ORM derives — they are the language of the business
- `domain/ports/` contains traits (`ItemRepository`, `AuthRepository`) that describe what the domain *needs* from the outside world, not how it's delivered
- `core/store/repos/` contains the PostgreSQL implementations of those traits — these are adapters
- `services/api/` contains HTTP adapters — routes call use-cases, use-cases call ports, ports are injected at startup via `app_state`
- `services/wasm/` is a secondary adapter for the same domain, compiled to WebAssembly

**Standards to enforce:**
- Dependency rule: `api` → `domain` is allowed; `domain` → `store` is **forbidden**
- Naming: entities are nouns (`Item`, `User`), ports are `{Noun}Repository` traits, use-cases are verb-noun (`CreateItem`, `GetItem`, `ListItems`, `DeleteItem`)
- Error handling: all errors flow through `app_error.rs` — no raw `unwrap()` outside tests
- No domain entity may derive or import from `sqlx`, `axum`, or any infrastructure crate

---

### 3.2 SvelteKit SDK — Layered Dependency Graph

**Pattern:** Layered SDK with unidirectional dependency flow (`ui` → `state` → `core`)

**Why this pattern:** Prevents UI components from embedding business logic, and prevents entity types from depending on rendering concerns. At year 5, `sdk/ui` can be swapped for a React implementation while `sdk/core` and `sdk/state` remain unchanged.

**How it's applied:**
- `sdk/core` exports entity types and constants — no Svelte, no reactive state
- `sdk/state` imports from `sdk/core`, exports Svelte 5 Rune stores — no UI components
- `sdk/ui` imports from both `sdk/state` and `sdk/core` — owns all visual components
- Apps (`vision`, `explorer`) import from `sdk/ui` and `sdk/state`, never directly from `sdk/core`

**Standards to enforce:**
- `sdk/core` must have zero Svelte dependencies in its `package.json`
- `sdk/state` must have zero component files (`.svelte`)
- Circular imports between SDK packages are forbidden
- Each SDK package exposes a single barrel export via `src/mod.ts`

---

### 3.3 Go RPC Service — Service Layer Pattern

**Pattern:** Simple Service Layer with injected providers

**Why this pattern:** The RPC service has a narrow responsibility — document generation and email delivery. It doesn't need CQRS or Hexagonal. A flat service layer with injected SMTP and template providers is the right tool for this scope. At year 5, if the service grows, ports can be introduced then.

**How it's applied:**
- `internal/service/` contains business logic (rendering a document, sending a notification)
- `internal/platform/providers/` contains infrastructure (SMTP client, Typst renderer)
- `internal/transport/http/router.go` wires everything together
- `templates/base/` provides the Typst design system; a single `templates/example.typ` demonstrates usage

---

### 3.4 Svelte Components — Atomic/Presentational Split

**Pattern:** Presentational vs. Container component split

**Why this pattern:** `sdk/ui/components/primitives/` components are pure presentational — they receive props and emit events, no store access. Container-level components (layout, admin dashboard stub) may access stores. This boundary makes primitives universally reusable and independently testable forever.

**Standards to enforce:**
- A primitive component must never import from `sdk/state`
- Container components are named with a suffix: `Dashboard`, `Layout`, `Panel`
- Primitive components are named by their visual role: `FormInput`, `GlassCard`, `StatusBadge`

---

## 4. Component Map & Directory Structure

### Proposed Final Structure

```
template/
├── docker-compose.yml               # infrastructure orchestration
├── flake.nix                        # root Nix dev shell
├── justfile                         # top-level task runner
├── traefik.yml                      # reverse proxy config
├── .gitignore
├── AGENTS/
│   └── README.md                    # AI agent instructions
├── scripts/
│   ├── ci.just
│   ├── deploy.just
│   └── dev.just
└── src/
    ├── client/
    │   ├── client.just
    │   ├── deno.json                 # workspace root
    │   ├── flake.nix
    │   ├── tsconfig.json
    │   ├── apps/
    │   │   ├── explorer/             # ✅ KEEP — Tauri desktop app (unchanged)
    │   │   │   ├── src/
    │   │   │   │   ├── app.d.ts
    │   │   │   │   ├── app.html
    │   │   │   │   ├── style.css
    │   │   │   │   ├── lib/
    │   │   │   │   │   ├── index.ts
    │   │   │   │   │   └── TauriGreet.svelte   # rename: TauriItem.svelte
    │   │   │   │   └── routes/
    │   │   │   │       ├── +layout.server.ts
    │   │   │   │       ├── +layout.svelte
    │   │   │   │       └── +page.svelte
    │   │   │   └── src-tauri/        # ✅ KEEP entirely unchanged
    │   │   └── vision/               # ✅ KEEP — dev showcase app (simplified content)
    │   │       ├── package.json
    │   │       ├── svelte.config.js
    │   │       ├── tsconfig.json
    │   │       ├── vite.config.ts
    │   │       └── src/
    │   │           ├── app.d.ts
    │   │           ├── app.html
    │   │           ├── hooks.server.ts
    │   │           ├── hooks.ts
    │   │           ├── lib/
    │   │           │   ├── components/
    │   │           │   │   ├── InteractionDeck.svelte   # ✅ KEEP
    │   │           │   │   ├── LabHeader.svelte          # ✅ KEEP
    │   │           │   │   ├── PersistenceInspector.svelte # ✅ KEEP
    │   │           │   │   ├── StoresMirror.svelte       # ✅ KEEP
    │   │           │   │   ├── panels/
    │   │           │   │   │   ├── DashboardPanel.svelte # ✅ KEEP
    │   │           │   │   │   └── ShortcutsPanel.svelte # ✅ KEEP
    │   │           │   │   └── showcase/
    │   │           │   │       ├── shared.ts             # genericize Item refs
    │   │           │   │       ├── Showcase.svelte       # ✅ KEEP
    │   │           │   │       ├── ShowcaseCard.svelte   # ✅ KEEP
    │   │           │   │       ├── state.svelte.ts       # genericize Item refs
    │   │           │   │       └── tabs/
    │   │           │   │           ├── Actions.svelte    # ✅ KEEP (generic)
    │   │           │   │           ├── DataInput.svelte  # genericize
    │   │           │   │           ├── Display.svelte    # genericize
    │   │           │   │           ├── Feedback.svelte   # ✅ KEEP (generic)
    │   │           │   │           ├── Navigation.svelte # ✅ KEEP (generic)
    │   │           │   │           └── Visual.svelte     # ✅ KEEP (generic)
    │   │           │   └── i18n/
    │   │           │       ├── messages.ts               # genericize keys
    │   │           │       ├── paraglide/.gitignore
    │   │           │       └── project.inlang/.gitignore
    │   │           └── routes/
    │   │               ├── +layout.svelte
    │   │               ├── +layout.ts
    │   │               ├── +page.svelte
    │   │               ├── AppLayout.svelte
    │   │               └── layout.css
    │   └── sdk/
    │       ├── core/
    │       │   ├── package.json
    │       │   └── src/
    │       │       ├── mod.ts
    │       │       └── entities/
    │       │           ├── item.ts         # NEW — replaces all domain entities
    │       │           └── user.ts         # KEEP — auth is infrastructure
    │       ├── state/
    │       │   ├── package.json
    │       │   └── src/
    │       │       ├── mod.ts
    │       │       └── stores/
    │       │           ├── auth.svelte.ts  # KEEP
    │       │           └── item.svelte.ts  # NEW — replaces all domain stores
    │       └── ui/
    │           ├── package.json
    │           ├── svelte.config.ts
    │           ├── vite.config.ts
    │           └── src/
    │               ├── app.d.ts
    │               ├── mod.ts
    │               ├── actions/
    │               │   └── tilt.ts         # ✅ KEEP
    │               ├── components/
    │               │   ├── admin/
    │               │   │   ├── AdminDashboard.svelte  # genericize (remove food refs)
    │               │   │   ├── AdminProfile.svelte    # ✅ KEEP (generic)
    │               │   │   └── mod.ts
    │               │   ├── landing/
    │               │   │   ├── Hero.svelte     # NEW — replaces HeroCarousel + RoleCards
    │               │   │   └── mod.ts
    │               │   ├── layout/
    │               │   │   ├── BottomNav.svelte        # ✅ KEEP
    │               │   │   ├── DynamicBackground.svelte # ✅ KEEP
    │               │   │   ├── Footer.svelte           # genericize text
    │               │   │   ├── Navbar.svelte           # genericize text/links
    │               │   │   ├── Navigation.svelte       # ✅ KEEP
    │               │   │   └── mod.ts
    │               │   └── primitives/
    │               │       ├── EmptyState.svelte       # ✅ KEEP
    │               │       ├── FormInput.svelte        # ✅ KEEP
    │               │       ├── FormSelect.svelte       # ✅ KEEP
    │               │       ├── GlassCard.svelte        # ✅ KEEP
    │               │       ├── GlassContainer.svelte   # ✅ KEEP
    │               │       ├── ImageWithFallback.svelte # ✅ KEEP
    │               │       ├── StatusBadge.svelte      # ✅ KEEP
    │               │       ├── SubmitButton.svelte     # ✅ KEEP
    │               │       └── mod.ts
    │               ├── i18n/
    │               │   ├── messages/
    │               │   │   └── en.json         # KEEP only English
    │               │   ├── paraglide/.gitignore
    │               │   └── project.inlang/.gitignore
    │               └── icons/
    │                   ├── icon-map.ts         # genericize (remove food/map icons)
    │                   └── mod.ts
    └── server/
        ├── flake.nix
        ├── server.just
        ├── db/
        │   ├── todo.md
        │   └── test/
        │       ├── fixtures.sh            # genericize seed data
        │       ├── run-all.sh
        │       ├── e2e/
        │       │   └── 01-smoke.sh        # ✅ KEEP
        │       ├── integration/
        │       │   └── 01-computed.sh     # KEEP (remove 02, 03)
        │       └── unit/
        │           └── 01-schema.sh       # ✅ KEEP
        ├── engine/
        │   ├── Cargo.toml
        │   ├── engine.Dockerfile
        │   ├── core/
        │   │   ├── domain/
        │   │   │   ├── Cargo.toml
        │   │   │   └── src/
        │   │   │       ├── lib.rs
        │   │   │       ├── entities/
        │   │   │       │   ├── item.rs     # NEW
        │   │   │       │   ├── user.rs     # KEEP
        │   │   │       │   └── mod.rs
        │   │   │       └── ports/
        │   │   │           ├── auth.rs     # KEEP
        │   │   │           ├── item.rs     # NEW
        │   │   │           └── mod.rs
        │   │   └── store/
        │   │       ├── Cargo.toml
        │   │       └── src/
        │   │           ├── client.rs
        │   │           ├── lib.rs
        │   │           ├── tests.rs        # genericize test data
        │   │           └── repos/
        │   │               ├── auth.rs     # KEEP
        │   │               ├── item.rs     # NEW
        │   │               └── mod.rs
        │   └── services/
        │       ├── api/
        │       │   ├── Cargo.toml
        │       │   └── src/
        │       │       ├── lib.rs
        │       │       ├── main.rs
        │       │       ├── adapters/
        │       │       │   ├── mod.rs
        │       │       │   ├── crypto/     # ✅ KEEP entirely
        │       │       │   └── http/
        │       │       │       ├── app_error_impl.rs  # KEEP
        │       │       │       ├── app_state.rs       # genericize injections
        │       │       │       ├── mod.rs
        │       │       │       ├── middleware/        # ✅ KEEP entirely
        │       │       │       └── routes/
        │       │       │           ├── auth.rs        # KEEP
        │       │       │           ├── items.rs       # NEW
        │       │       │           └── mod.rs
        │       │       ├── application/
        │       │       │   ├── app_error.rs  # KEEP
        │       │       │   ├── mod.rs
        │       │       │   └── use_cases/
        │       │       │       ├── auth.rs   # KEEP
        │       │       │       ├── items.rs  # NEW
        │       │       │       └── mod.rs
        │       │       └── infra/            # ✅ KEEP entirely
        │       └── wasm/                     # ✅ KEEP entirely
        └── rpc/
            ├── README.md
            ├── go.mod
            ├── rpc.Dockerfile
            ├── cmd/server/main.go            # ✅ KEEP
            ├── internal/                     # ✅ KEEP entirely
            ├── templates/
            │   ├── example.typ               # NEW — single stub template
            │   ├── _lib/brand.typ            # genericize brand name/colors
            │   └── base/                     # ✅ KEEP entirely (_colors, _components, _page, _typography)
            └── test/
                ├── argus.http                # genericize endpoints
                └── get_token.go             # ✅ KEEP
```

---

### Component Responsibility Table

| Component | Responsibility | Must NOT do |
|---|---|---|
| `sdk/core/entities/item.ts` | Define the `Item` type with id, title, description, status | Import from state or UI |
| `sdk/core/entities/user.ts` | Define `User` and `AuthToken` types | Contain business logic |
| `sdk/state/stores/item.svelte.ts` | Reactive CRUD store for Item list and selected item | Render any UI |
| `sdk/state/stores/auth.svelte.ts` | Manage auth session state | Make UI decisions |
| `sdk/ui/components/primitives/` | Stateless visual building blocks | Access any store |
| `sdk/ui/components/layout/` | App shell, nav, footer | Contain business logic |
| `sdk/ui/components/admin/AdminDashboard` | Container showing Item list via store | Contain its own data fetching logic (delegate to store) |
| `sdk/ui/components/landing/Hero` | Single-screen landing section with CTA | Reference domain-specific copy |
| `engine/core/domain/entities/item.rs` | Pure Rust Item struct | Import sqlx, axum, or any infra crate |
| `engine/core/domain/ports/item.rs` | `ItemRepository` trait definition | Know anything about PostgreSQL |
| `engine/core/store/repos/item.rs` | PostgreSQL implementation of `ItemRepository` | Contain business rules |
| `engine/services/api/use_cases/items.rs` | Orchestrate create/read/list/delete Item flows | Know HTTP request/response shapes |
| `engine/services/api/routes/items.rs` | Parse HTTP, call use-cases, serialize response | Contain business logic |
| `rpc/templates/base/` | Typst design tokens and layout primitives | Reference any specific domain (food, real-estate) |
| `rpc/templates/example.typ` | Single demonstration document template | Anything beyond showing how to use base/ |

---

## 5. Trade-off Analysis

```
DECISION: How to genericize domain entities
OPTIONS CONSIDERED:
  A. Rename existing files (business.ts → item.ts, etc.) — fast but leaves
     domain semantics in field names (e.g., `restaurantName`, `menuPrice`)
  B. Create new files from scratch with generic fields, delete old ones — clean
     break, no residual domain language, slightly more work
  C. Abstract to a generic interface and keep domain files as examples —
     adds complexity, defeats the purpose of a minimal template
CHOSEN: Option B
REASON: A template's primary value is clarity. Domain field names in the
  source are noise that slows down every developer reading the template.
  The extra work of new files is a one-time cost.
REVISIT IF: The team decides to include multiple domain examples side by side
```

```
DECISION: Whether to keep the `analytics/` UI component folder
OPTIONS CONSIDERED:
  A. Remove it entirely — simplest, cleanest template
  B. Keep it with a generic `StatsCard.svelte` only — shows the pattern
     without domain content
  C. Keep BusinessDataTable renamed to ItemDataTable — domain semantics
     leak through the table columns
CHOSEN: Option A (Remove analytics/ folder)
REASON: The pattern for a data table is already demonstrated by the
  primitives. An extra half-empty folder creates confusion about intent.
REVISIT IF: The template's goal expands to include a full analytics layer example
```

```
DECISION: i18n — how many languages in the template
OPTIONS CONSIDERED:
  A. Keep all 13 languages — shows full i18n capability
  B. Keep only en.json — minimal, shows the pattern without noise
  C. Keep en.json + es.json — shows a two-language example
CHOSEN: Option B (en.json only)
REASON: The template's job is to show *how* i18n works, not to provide
  translations. 13 half-translated files for food-specific strings would
  need to all be updated. One file with generic keys is honest and minimal.
REVISIT IF: The template is used as a base for multilingual starter kits
```

```
DECISION: What to do with rpc/templates/ (Typst documents)
OPTIONS CONSIDERED:
  A. Delete all .typ files and keep only base/ — purest but removes the
     demonstration of how to use the Typst system
  B. Keep one generic example.typ that uses base/ — shows usage without domain
  C. Keep commerce/ and listing/ as commented-out examples — adds noise
CHOSEN: Option B (one example.typ)
REASON: base/ alone is not self-explanatory. One working example that
  imports from base/ and renders a simple document is the right teaching artifact.
REVISIT IF: The rpc service's document responsibility expands significantly
```

```
DECISION: DB test suite scope
OPTIONS CONSIDERED:
  A. Remove all domain-specific test scripts (finance, geo, iam, spatial) and
     keep only smoke + schema + one integration test
  B. Rewrite all test scripts with generic item data — comprehensive but
     high effort with no architectural gain
  C. Delete the entire pgsql/ test folder — loses the testing pattern demonstration
CHOSEN: Option A
REASON: The test folder's job in a template is to show the testing pattern,
  not to provide coverage for a domain that doesn't exist. Smoke + schema +
  one integration test is sufficient for that purpose.
REVISIT IF: The template expands to include a real domain layer with full test coverage
```

---

## 6. Phased Implementation Plan

### Phase 1 — Server Core Genericization
**Goal:** Make the Rust engine and Go RPC service domain-agnostic

**Components to build/modify:**
- Delete `engine/core/domain/entities/`: business.rs, category.rs, city.rs, review.rs
- Create `engine/core/domain/entities/item.rs` — generic Item struct (id, title, description, status, created_at)
- Delete `engine/core/domain/ports/`: business.rs, review.rs
- Create `engine/core/domain/ports/item.rs` — ItemRepository trait (create, find_by_id, list, delete)
- Delete `engine/core/store/repos/`: business.rs, review.rs → Create `repos/item.rs`
- Delete `engine/services/api/use_cases/`: businesses.rs, recommendations.rs, reviews.rs → Create `use_cases/items.rs`
- Delete `engine/services/api/routes/`: businesses.rs, recommendations.rs, reviews.rs → Create `routes/items.rs`
- Update `app_state.rs` to inject ItemRepository instead of domain-specific repos
- Delete `rpc/templates/`: plantilla.typ, recibo.typ, commerce/, listing/, marketing/, shared/
- Create `rpc/templates/example.typ` using only `base/` components
- Genericize `rpc/templates/_lib/brand.typ` (remove specific brand name/colors)
- Remove domain test scripts: pgsql/test-finance, test-geo, test-iam, test-spatial, test-seed-validation, integration/02-events.sh, 03-graph.sh
- Genericize `db/test/fixtures.sh` with item seed data

**Dependencies:** None — this phase is self-contained in the server

**Exit criteria:**
- `cargo build` passes with zero domain entity references outside `item.rs` and `user.rs`
- `just server` starts cleanly with Item CRUD endpoints registered
- `db/test/e2e/01-smoke.sh` passes against the running server
- `grep -r "business\|dish\|merchant\|review\|visitor" src/server/` returns zero results

**Risk flags:**
- [HIGH RISK] `app_state.rs` wires all repository injections — if any use-case or route was importing a domain repo directly (bypassing app_state), the compile error will reveal it but needs careful resolution

---

### Phase 2 — SDK Genericization
**Goal:** Make the TypeScript SDK (`core`, `state`, `ui`) domain-agnostic

**Components to build/modify:**
- Delete `sdk/core/src/entities/`: analytics.ts, business.ts, dish.ts, geo.ts, review.ts, visitor.ts
- Delete `sdk/core/src/constants/categories.ts`
- Create `sdk/core/src/entities/item.ts` — Item interface matching Rust entity shape
- Keep `sdk/core/src/entities/user.ts` unchanged
- Update `sdk/core/src/mod.ts` barrel export
- Delete `sdk/state/src/stores/`: analytics, business, dish, geo, review, visitor stores
- Create `sdk/state/src/stores/item.svelte.ts` — reactive store with CRUD operations and loading/error state
- Update `sdk/state/src/mod.ts` barrel export
- Delete `sdk/ui/src/components/`: discover/, merchant/, share/, visitor/, analytics/
- Delete `sdk/ui/src/utils/category-colors.ts`
- Delete `sdk/ui/src/icons/leaflet-icons.ts`
- Genericize `sdk/ui/src/icons/icon-map.ts` (remove map/food-specific icons)
- Delete `sdk/ui/src/components/primitives/`: CategoryBadge.svelte, PriceTag.svelte, RatingDisplay.svelte
- Replace `sdk/ui/src/components/landing/` with a single `Hero.svelte`
- Genericize `sdk/ui/src/components/layout/` text content (Navbar links, Footer copy)
- Genericize `sdk/ui/src/components/admin/AdminDashboard.svelte` to show Item list
- Reduce `sdk/ui/src/i18n/messages/` to `en.json` only with generic keys
- Update `sdk/ui/src/mod.ts` barrel export

**Dependencies:** Phase 1 must be complete (item.ts entity shape mirrors Rust entity)

**Exit criteria:**
- `deno check` passes across all SDK packages
- `grep -r "business\|dish\|merchant\|review\|visitor\|geo\|category" src/client/sdk/` returns zero results
- `sdk/ui` storybook / `vision` app loads without runtime errors

**Risk flags:**
- `sdk/ui/src/mod.ts` likely re-exports deleted components — update carefully or the entire SDK build breaks
- `vision` showcase app references specific component imports — will need updating in Phase 3

---

### Phase 3 — Apps Genericization
**Goal:** Update `vision` dev-lab and `explorer` Tauri app to use generic Item domain

**Components to build/modify:**

**vision app:**
- Genericize `showcase/shared.ts` — replace food data fixtures with Item fixtures
- Genericize `showcase/state.svelte.ts` — replace domain store references with item store
- Genericize `showcase/tabs/DataInput.svelte` — replace food form fields with generic Item form
- Genericize `showcase/tabs/Display.svelte` — replace food card display with generic Item display
- Update `lib/i18n/messages.ts` to use generic message keys
- Remaining tabs (Actions, Feedback, Navigation, Visual) require no changes if they already use generic primitives

**explorer app:**
- Rename `src/lib/TauriGreet.svelte` → `TauriItem.svelte`
- Update `src/lib/index.ts` to export the renamed component
- Update `+page.svelte` to import and use `TauriItem`
- `src-tauri/` — NO CHANGES (Rust backend is independent)

**Dependencies:** Phase 2 must be complete (all SDK exports must resolve correctly)

**Exit criteria:**
- `vision` app runs in browser, all showcase tabs load without errors, no food/domain terminology visible
- `explorer` Tauri app compiles and runs: `just tauri dev`
- `grep -r "business\|dish\|merchant\|review\|visitor" src/client/apps/` returns zero results
- A new developer can clone and run `just dev` with the full stack working end-to-end

**Risk flags:**
- Tauri's `src-tauri/tauri.conf.json` may reference app-specific identifiers (bundle ID, app name) — check and genericize these strings

---

### Phase 4 — Final Audit & Documentation
**Goal:** Guarantee zero domain leakage and ensure the template is self-explanatory

**Actions:**
- Run full-codebase grep for all domain terms: `business, dish, merchant, review, visitor, geo, city, category, restaurant, food, tourist, leaflet, recibo, plantilla, cma, listing, brochure`
- Genericize any remaining hits (comments, variable names, README strings)
- Update `AGENTS/README.md` to describe the generic Item domain
- Add a top-level `README.md` describing the template's architecture layers
- Verify `docker-compose.yml` has no domain-specific service names or env vars
- Verify `justfile` and `scripts/*.just` have no domain-specific task names

**Dependencies:** Phases 1–3 complete

**Exit criteria:**
- The full-codebase grep returns zero hits for all domain terms
- `just ci` passes (build + tests)
- A peer developer unfamiliar with the original project can read the template and describe the data-flow correctly

---

## 7. Implementation Management

### Dependency Graph (plain text)

```
Phase 1 (Server)
    ↓
Phase 2 (SDK) — item.ts entity shape must match Rust Item struct
    ↓
Phase 3 (Apps) — apps depend on SDK exports being clean
    ↓
Phase 4 (Audit) — requires all previous phases complete
```

### Ownership Suggestions

| Work | Recommended Owner |
|---|---|
| Phase 1 — Rust engine refactor | Backend / Rust engineer |
| Phase 1 — Go RPC / Typst cleanup | Backend engineer or full-stack |
| Phase 2 — SDK core & state | Full-stack engineer |
| Phase 2 — SDK UI components | Frontend engineer |
| Phase 3 — vision app | Frontend engineer |
| Phase 3 — explorer Tauri | Full-stack (requires Rust + TS context) |
| Phase 4 — audit & docs | Any engineer, ideally not the one who wrote the code |

### Critical Path

```
item.rs (Rust entity) → item.ts (SDK entity) → item.svelte.ts (store)
→ AdminDashboard.svelte (uses store) → vision showcase (uses dashboard)
```

Any delay in defining the `Item` struct shape cascades through all subsequent phases. This is the single most important decision to make and lock early.

### Integration Points (high coordination required)

- **Item field shape:** The fields defined in `engine/core/domain/entities/item.rs` must exactly match `sdk/core/entities/item.ts`. These are owned by different engineers in different languages. [HIGH RISK — coordinate before starting Phase 2]
- **SDK mod.ts barrel exports:** Deleting components without updating `mod.ts` breaks the entire SDK consumer chain silently until runtime. Every deletion in Phase 2 must be paired with a `mod.ts` update.
- **App state injection (Rust):** `app_state.rs` is the wiring point for all repository injection. Changes here affect every route and use-case simultaneously.

### Breaking Changes

- [HIGH RISK] Deleting `sdk/ui/src/components/discover/`, `merchant/`, `visitor/` — any app or test that imports these will break at compile time. Verify no consumers exist outside the template repo before deleting.
- [HIGH RISK] Removing 12 of 13 i18n language files — if the `paraglide` compiler is configured to require certain locales, the build will fail. Check `project.inlang` config before deleting.

---

## 8. Validation & Testing Strategy

| Layer | Test Type | What it verifies |
|---|---|---|
| Rust domain entities | Unit (Rust) | Item struct serialization, validation rules |
| Rust store repos | Integration (Rust + testcontainers or fixture DB) | ItemRepository impl correctly reads/writes to PostgreSQL |
| Rust API routes | Integration (HTTP) | `/items` endpoints return correct shapes, auth middleware rejects unauthenticated requests |
| Go RPC service | Integration | Document template renders without panic, email service sends |
| SDK core types | TypeScript type-check (`deno check`) | No type errors in entity and store definitions |
| SDK state stores | Unit (Vitest) | Item store correctly manages loading/error/data state |
| SDK UI primitives | Component tests (Playwright component) | Primitive renders with required props, emits correct events |
| Full stack flow | E2E (`01-smoke.sh`) | Create item via API → fetch via SDK → renders in vision app |
| Architecture rules | Fitness functions (grep/TS path analysis) | No cross-domain imports, no domain terms in generic layers |

### Architecture Fitness Functions (automate these in CI)

- `grep -r "business\|dish\|merchant" src/` → must return zero hits (post-Phase 4)
- TypeScript: `sdk/core/package.json` must not list `svelte` as a dependency
- Rust: `engine/core/domain/Cargo.toml` must not list `sqlx`, `axum`, or `tokio` as dependencies
- File count check: `sdk/ui/src/i18n/messages/` must contain exactly one `.json` file

### Local Dev Validation (before opening a PR)

1. `just dev` — full stack starts, no panic/compile error
2. `deno check` — all TypeScript passes
3. `cargo build` — Rust builds clean
4. `db/test/e2e/01-smoke.sh` — smoke test passes
5. `grep -r "business\|dish\|merchant\|review\|visitor" src/` — returns zero results

### Observability Strategy

For a template, observability means **developer confidence**, not production metrics. Ensure:
- `logger.rs` middleware in the Rust API logs request/response for every `/items` call
- `internal/platform/logger/handler.go` in Go RPC logs every document render
- `StoresMirror.svelte` in vision app (already exists) — shows live store state for any active Item store
- `PersistenceInspector.svelte` in vision app (already exists) — shows localStorage/session state

---

## 9. Open Questions & Risks

1. **PostgreSQL schema** — The DB schema likely has `businesses`, `dishes`, `reviews` tables. This spec does not include a migration to `items`. The server will either need a migration or the `item.rs` repo must be wired to a stub/in-memory implementation for the template. [MUST DECIDE before Phase 1 is considered done]

2. **Paraglide i18n compiler** — The `project.inlang` configuration may enumerate supported locales. Removing 12 language files without updating the inlang config will cause the Paraglide compiler to error. Inspect both `project.inlang` configs (in `vision/` and `sdk/ui/`) before deleting language files.

3. **explorer app bundle ID** — `src-tauri/tauri.conf.json` almost certainly contains a domain-specific bundle identifier (e.g., `com.yourapp.explorer`). This should be genericized to something like `com.template.explorer` or left as a documented placeholder.

4. **WASM service** — `engine/services/wasm/src/lib.rs` may expose domain-specific functions. Its scope was not analyzable from the file tree alone. Inspect before Phase 1 closes.

5. **`rpc/test/test-enterprise-billing.sh`** — This script name implies billing/enterprise domain logic in the Go RPC service. Needs inspection — if it tests domain features, remove it; if it tests infrastructure (JWT, rate limits), keep and rename it.

6. **`db/test/pgsql/test-api.sh` and `test-crud.sh`** — These are borderline: they may test infrastructure patterns or food-domain endpoints. Inspect before deciding whether to keep with generic data or remove entirely.