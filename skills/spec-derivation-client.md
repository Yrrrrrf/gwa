# GWA Client · Architecture Specification

**Status:** Draft v1
**Scope:** Client-side only (`src/client/`)
**Complements:** `GWA Server · Derivation Pipeline Specification`
**Audience:** Engineers building the two apps (Vision, Explorer) and the five-package SDK

---

## 0. Executive Summary

This specification defines the client side of the GWA template as a **five-package SDK consumed by two apps**, where every piece of data, type, and shared logic is derived from a single server-side source rather than hand-authored in the browser. The five packages layer strictly — `pkgs` (generated types and WASM) ← `core` (domain-adjacent interfaces) ← `api` (GraphQL + Connect-TS clients) ← `state` (Svelte rune stores) ← `ui` (shared components) — and two apps consume them: Vision as the admin/developer lab built on rune-lab, and Explorer as the end-user showroom exercising three perspectives (Guest, Consumer, Producer) against the full server stack. Explorer's surface is deliberately minimal — five routes total, each one proving an interaction pattern the other four cannot prove — and every screen is capable of rendering honest empty states without hardcoded data. The architecture preserves the hexagonal discipline already present on the server: stores never call the network directly, components never reach past stores, and generated artifacts in `pkgs` are never edited by hand. This is a long-term bet on **single-direction data flow** across the full stack — server owns the shape, client consumes it mechanically — and on the principle that **a template is judged by how fast someone can delete it**, which only works if nothing in the template is hand-maintained without cause.

---

## 1. Context & Constraints

### 1.1 Where This Fits

The parent `GWA Server · Derivation Pipeline Specification` established four authoritative sources on the server side: SurrealDB schema (data at rest), protobuf (wire shapes), WASM crate (shared logic), and exported GraphQL schema (API surface). This document specifies **how the client consumes those four outputs** and how it presents them through the two apps. It does not redefine the derivation pipeline; it defines the downstream consumption contract.

Current client state (as of spec authoring):

| Concern | Current State | Target |
|---|---|---|
| SDK packages | `core`, `state`, `ui` (three) | `core`, `state`, `ui`, `api`, `pkgs` (five) |
| Network clients | None — stores have setters but nothing calls them | `sdk/api` wraps GraphQL + Connect-TS clients |
| Generated types from server | None — `sdk/core` hand-authors entity interfaces mirroring Rust | `sdk/pkgs` consumes proto-TS, graphql-codegen output, WASM module |
| Apps | `vision` (present, functional lab), `explorer` (referenced in configs, not built) | Both exist, both wired to real data |
| Auth state | `authStore` with `UserRole` enum, unused | `authStore` with `capabilities[]`, hardcoded with TODOs for integration |
| Route structure in Explorer | N/A | Five routes, guards based on capabilities |
| Hardcoded demo data in shared components | Present (`securityItems`, `metrics` in `AdminProfile`; Spanish copy; restaurant-tell `EmptyState` default) | Removed — stores + empty states instead |

The "Current State" column is where the spec starts. The "Target" column is where Phase 5 ends.

### 1.2 Goals

1. **Five-package SDK with strict layering** — `pkgs` is a leaf (no client deps), `core` depends on `pkgs`, `api` depends on `core`, `state` depends on `api` and `core`, `ui` depends on `state`, `core`, and `pkgs`. No other edges.
2. **No hand-authored entity types on the client** — `User`, `Item`, `Comment`, `Coordinates` come from `sdk/pkgs` as generated outputs of the server's protobuf and GraphQL schema. If a field is added to `Item` on the server, the client's type changes on the next codegen run and any code that didn't update stops compiling.
3. **No hardcoded domain data in any screen** — every list, counter, metric, and rating comes from a store; every store is populated by `sdk/api`; every `api` call terminates in a real GraphQL query or gRPC-web call against the running server. A demo array in a component is a bug.
4. **Three perspectives as capability accumulation, not as separate apps** — Guest (no auth), Consumer (authenticated, can interact), Producer (authenticated, can create). A single user may hold both `consume` and `produce` capabilities; the active perspective is an ephemeral UI state, not a property of the user record.
5. **Five Explorer routes maximum** — each one exercises a pattern the other four cannot. Additional screens are rejected unless they prove a new stack capability.
6. **The template is forkable in an afternoon** — cloning, renaming, rebranding, and wiring against a fork of the server should take hours, not days. Every decision in this spec is evaluated against that fork-cost.

### 1.3 Architectural Rules (Mandated)

1. **SDK layering is strict** — no backward edges (e.g., `core` cannot import from `state`), no sibling edges (e.g., `api` cannot import from `ui`). Enforced by a fitness function.
2. **Components in `sdk/ui` are domain-agnostic** — they accept props, emit events, and contain no business logic. Domain-specific composition lives in `apps/explorer/src/lib/` or `apps/vision/src/lib/`.
3. **Stores are the only state owners** — no Svelte `$state` inside components for domain data. Components receive reactive state from stores via module imports or props.
4. **`sdk/api` is the only place that calls the network** — components never `fetch()`, stores never `fetch()`. The api layer owns every outbound call.
5. **Generated artifacts in `sdk/pkgs` are read-only** — marked with a header warning; a fitness function fails if their content drifts from their source without regeneration.
6. **Auth is hardcoded today, integration-ready tomorrow** — every hardcoded auth decision is marked with a `TODO(auth):` comment citing what needs to happen when integration lands.

### 1.4 Out of Scope

- **Tauri desktop packaging.** The configs are present but the spec focuses on the web surface. Desktop is an eventual deployment concern, not an architecture concern.
- **PWA installability hardening.** The `pwa-check` script is referenced but the template's PWA story is a post-launch concern.
- **E2E visual regression testing.** Valuable eventually; out of scope for this plan.
- **Internationalization beyond what exists.** The inlang/paraglide setup already works for locale switching; no additional i18n architecture is specified here.
- **Theming beyond DaisyUI's defaults.** Palette parameterization is a fork-time concern; the template ships with neutral defaults.
- **The admin experience (Vision).** Vision is complete enough to be treated as stable; this spec focuses almost entirely on Explorer. Vision changes only where it must (e.g., removing brand leakage in `AdminProfile`).
- **The forkable CLI tool.** The user has a separate CLI project for template scaffolding; this spec trusts that exists and does not duplicate its concerns.

### 1.5 Assumptions

[ASSUMPTION] The server's Phase 2 (protobuf for entities) lands before or alongside Phase 3 of this spec. If it slips, `sdk/pkgs` falls back to hand-authored types temporarily with clear TODOs.

[ASSUMPTION] The server's `schema.graphql` is committed and regenerated per server Phase 4. Without it, `graphql-codegen` on the client has nothing to consume.

[ASSUMPTION] `wasm-pack build` on the server's `engine/services/wasm` produces a browser-consumable artifact with TypeScript declarations via `tsify`. Verified by server Phase 3's spike.

[ASSUMPTION] The chosen GraphQL client is **URQL** or **graphql-request** — lightweight, framework-agnostic, supports subscriptions. Apollo Client is considered too heavy for a template. If this spec's authors prefer otherwise, substitution is straightforward within `sdk/api`.

[ASSUMPTION] The chosen Connect-TS client uses the `@connectrpc/connect-web` transport (HTTP/2 over fetch). This aligns with the server's Connect protocol choice.

[ASSUMPTION] Route structure uses SvelteKit's file-system routing. Alternatives (hash routing, custom routers) are not considered; SvelteKit is the existing framework.

---

## 2. Architecture Overview

### 2.1 Five-Package SDK

The SDK is a workspace of five packages, organized so that each package has one responsibility and the dependency graph is a DAG with no backward edges.

**`sdk/pkgs`** — the leaf. Contains generated TypeScript types from the server's protobuf, generated TypeScript types from the server's GraphQL schema, and the compiled WASM module with its TypeScript declarations. Nothing in `pkgs` is authored by hand except its `package.json` and a small re-export `mod.ts`. Consumed by every other package in the SDK.

**`sdk/core`** — domain-adjacent types and pure utilities that are client-specific but do not do I/O. Re-exports `pkgs`'s entity types with client-friendly aliases where helpful. Contains Zod schemas for runtime validation at the wire boundary (server can return malformed data; `core` is where we catch it). No network, no Svelte, no DOM.

**`sdk/api`** — the network layer. Wraps a GraphQL client (queries, mutations, subscriptions) and a Connect-TS client (unary RPC to the sidecar). Exports named functions per operation (`fetchItems`, `likeItem`, `subscribeToItem`, `generateDocument`). Consumes types from `core` and `pkgs`. Every outbound HTTP call in the entire client runs through this package.

**`sdk/state`** — the reactive state layer. Svelte rune stores (`authStore`, `itemStore`, `commentStore`, `uiStore`). Stores are dumb state holders with setters; they do not call the network. `sdk/api` orchestrates the call-then-setter flow. The existing `authStore` stays hardcoded with TODOs; the others wire into `api`.

**`sdk/ui`** — presentational components. Glassmorphism primitives (`GlassCard`, `FormInput`, `SubmitButton`), layout pieces (`Navbar`, `BottomNav`, `Footer`), and template-specific domain components (`ItemCard`, `PerspectiveToggle`). Consumes types from `pkgs`/`core` and reactive data from `state`. No direct `api` calls — if a component needs data, it subscribes to a store.

### 2.2 Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────────┐
│                              APPS LAYER                                │
│                                                                       │
│   apps/vision (admin lab)            apps/explorer (3-perspective)    │
│   ─────────────────────────────      ────────────────────────────    │
│   · rune-lab workspace layout        · / (Discover, public)           │
│   · Component showcase               · /auth (Login/Signup)           │
│   · Stores mirror                    · /items/:id (Detail)            │
│   · Persistence inspector            · /items/new, /items/:id/edit    │
│   · Admin dashboards                 · /me (Dashboard, perspective-   │
│                                        aware)                         │
└──────────────┬────────────────────────────────┬──────────────────────┘
               │                                │
               ▼                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│                            sdk/ui                                     │
│                                                                       │
│   Primitives:   GlassCard, GlassContainer, FormInput, FormSelect,     │
│                 SubmitButton, EmptyState, StatusBadge,                │
│                 ImageWithFallback                                     │
│   Layout:       Navbar, BottomNav, Footer, DynamicBackground          │
│   Domain:       ItemCard (new), PerspectiveToggle (new)               │
│   Landing:      Hero                                                  │
│   Admin:        AdminDashboard, AdminProfile (trimmed of demo data)   │
└──────────────┬────────────────────────────────┬──────────────────────┘
               │                                │
               ▼                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│                           sdk/state                                   │
│                                                                       │
│   authStore     — hardcoded with TODO(auth): markers                  │
│                   exposes { user, capabilities, activePerspective }   │
│   itemStore     — list + selected item, populated by sdk/api          │
│   commentStore  — comments of active item, live-updated via           │
│                   sdk/api subscription                                │
│   uiStore       — ephemeral UI state (active perspective, search      │
│                   filters, map viewport)                              │
└──────────────┬────────────────────────────────┬──────────────────────┘
               │                                │
               ▼                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│                            sdk/api                                    │
│                                                                       │
│   gql-client    — URQL instance, queries/mutations/subscriptions     │
│   rpc-client    — Connect-TS client for gateway-side RPC              │
│   operations    — fetchItems, searchItems, likeItem, commentOn,       │
│                   createItem, updateItem, deleteItem,                 │
│                   subscribeToItem, generateDocument, login, logout    │
└──────────────┬────────────────────────────────┬──────────────────────┘
               │                                │
               ▼                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│                           sdk/core                                    │
│                                                                       │
│   · Re-exports of entity types from sdk/pkgs                          │
│   · Zod schemas for wire-boundary validation                          │
│   · Pure client-side utilities (date formatting, URL helpers)         │
└──────────────┬────────────────────────────────────────────────────────┘
               │
               ▼
┌───────────────────────────────────────────────────────────────────────┐
│                           sdk/pkgs                                    │
│                                                                       │
│   proto/       ← generated TS from server's proto/template/v1/*.proto │
│   graphql/     ← generated TS from server's schema.graphql            │
│                  (via graphql-codegen)                                │
│   wasm/        ← compiled WebAssembly module + .d.ts                  │
│                  (from server's engine/services/wasm via wasm-pack)   │
│   mod.ts       ← thin re-exports                                      │
└───────────────────────────────────────────────────────────────────────┘
                              ▲
                              │
                              │   Sourced from:
                              │   ─────────────
                              │   proto/template/v1/*.proto
                              │   engine/services/gateway/schema.graphql
                              │   engine/services/wasm/ (native+wasm32)
                              │
                      (server derivation outputs)
```

### 2.3 Two Apps, Two Purposes

**Vision — the admin lab.** Admin-facing, desktop-first, built on rune-lab's `WorkspaceLayout` with navigation panel, content area, and detail panel. It is the operator interface: command palette, keyboard shortcuts, stores mirror, persistence inspector, component showcase. Its job is to expose the internals of the client for developer and admin use. A real fork typically either drops Vision entirely (consumer-only apps don't need it) or keeps it as an internal development tool. This spec treats Vision as **substantially complete**: changes are limited to removing brand-leakage (Spanish copy, XIBALBA references, hardcoded metrics arrays in `AdminProfile`) and generalizing hardcoded role labels.

**Explorer — the end-user showroom.** Mobile-first with desktop scaling, built on standard SvelteKit layouts with `Navbar`, `BottomNav`, and `Footer` from `sdk/ui`. Its job is to exercise the three end-user perspectives against the full stack: Guest browsing without auth, Consumer interacting with items, Producer creating items. Every screen in Explorer exists to prove one interaction pattern; ceremonial screens are rejected. A real fork typically keeps Explorer as its starting point and iterates from there.

The two apps share the entire SDK. Nothing that lives in `apps/vision/` is imported by `apps/explorer/` or vice versa — apps are leaves of the dependency graph.

### 2.4 The Three Perspectives Model

Perspective is a function of two inputs: whether the user has a session (`authStore.user !== null`) and what capabilities they hold (`authStore.user.capabilities: Capability[]`). The active perspective is UI state (`uiStore.activePerspective`), not user data.

**Guest** — `authStore.user === null`. Can view public content, search, browse. Cannot like, comment, create, or subscribe. Routes that require auth redirect to `/auth`. Write-capable UI elements (like button, comment form, "new item" button) are hidden, not disabled.

**Consumer** — `authStore.user !== null && capabilities.includes("consume")`. Can like, comment, save, subscribe. Default perspective after login. The `BottomNav` shows Discover, Saved, Profile.

**Producer** — `authStore.user !== null && capabilities.includes("produce") && uiStore.activePerspective === "produce"`. Can create, edit, and delete items they own. Accessed via the `PerspectiveToggle` in the navbar when the user holds both capabilities. The `BottomNav` shows Dashboard, My Items, Profile. The `/me` dashboard shows engagement metrics for their own items.

A user who holds only `consume` does not see the `PerspectiveToggle`. A user who holds only `produce` has their active perspective pinned to `produce`. A user with both capabilities sees the toggle and can switch. This is the minimal interaction model that honestly reflects two-sided platforms.

**Admin** — `capabilities.includes("admin")`. Admin routing in Explorer redirects to Vision. Vision itself checks for the `admin` capability as its top-level guard. Admin is not a perspective within Explorer; it is a separate app surface.

---

## 3. Design Patterns & Code Standards

### 3.1 Strict SDK Layering

**Pattern:** Layered Architecture (inverted-dependency-aware)

**Why:** Without enforced layering, "shared code" becomes a dumping ground. Components import stores, stores import components, utilities import everything, and every file can reach every other file. Over a 3-year lifetime, this produces an unnavigable mass. The five-package split with a directed acyclic dependency graph forces every import to travel downhill, which is the only direction that stays navigable.

**How it's applied:** Each package's `package.json` declares its allowed dependencies. `pkgs` has zero SDK dependencies. `core` depends only on `pkgs`. `api` depends on `core` and `pkgs`. `state` depends on `api`, `core`, and `pkgs`. `ui` depends on `state`, `core`, and `pkgs`. Apps depend on everything. A linter rule (via `eslint-plugin-boundaries` or a custom script) rejects any import that violates these edges.

**What it protects against:**
- **Year 3:** New contributors can't accidentally put a network call in `sdk/ui` because the `fetch` import isn't available there — only `sdk/api` declares network primitives.
- **Year 5:** Extracting the SDK as a standalone library (e.g., for a mobile app) is mechanical, because the dependency graph is already clean.
- **Year 10:** The codebase still works because every package's scope stayed narrow. Rot sets in when layering blurs; this rule keeps it sharp.

**Standards:**
- Every package has a `mod.ts` as its public entry point; internal modules are private to that package
- The allowed-imports rule is codified in an ESLint config and checked in CI
- Circular imports between packages are structurally impossible (not merely discouraged) because the graph is a DAG

### 3.2 Generated-Only `pkgs` Package

**Pattern:** Read-Only Generated Artifacts

**Why:** Identical rationale to the server's Category 2 (wire shapes). Hand-mirroring server types on the client is the single biggest source of silent drift in full-stack applications. A new optional field on `Item` added server-side looks like "no client changes needed" — until a consumer accesses the field and it's `undefined` at runtime. The `pkgs` package eliminates this class of bug by deriving all types mechanically.

**How it's applied:** `sdk/pkgs/src/` contains three subdirectories: `proto/` (output of `protoc-gen-es` from `server/proto/template/v1/*.proto`), `graphql/` (output of `graphql-codegen` from `server/.../schema.graphql`), and `wasm/` (output of `wasm-pack build` from `server/.../wasm/`). Each directory contains a `@generated` header comment. The `mod.ts` re-exports curated subsets with client-friendly names. All content in these subdirectories is committed and tracked — treating them as build artifacts would defeat review visibility.

**What it protects against:**
- **Year 3:** Client and server type definitions cannot diverge, because one generates from the other.
- **Year 5:** Adding a new language consumer (e.g., a React Native client) means running the same codegen pipeline with a different target — no new source of truth.
- **Year 10:** The codebase still works because every type in the client traces back to a single authored source on the server.

**Standards:**
- Header comment on every generated file: `// @generated · do not edit · regenerate with: just client:codegen`
- Pre-commit hook rejects commits that modify generated files without the corresponding server source changing
- CI runs `just client:codegen` and fails if anything differs

### 3.3 Stores as Dumb State, `sdk/api` as Orchestrator

**Pattern:** State-Action Separation (Flux-adjacent, adapted for Svelte runes)

**Why:** When stores know how to fetch their own data, every component that uses a store implicitly triggers network calls, and the mapping between "I rendered this component" and "I hit the network" becomes impossible to reason about. Separating "hold state" from "mutate state via side effects" lets components stay declarative and lets the network layer stay testable.

**How it's applied:** Stores in `sdk/state` expose getters (for reactive reads) and setters (for writes). They do not call `fetch`, do not import from `sdk/api`. The api layer (`sdk/api/operations/`) contains functions that (a) call the network, (b) validate the response via Zod schemas from `sdk/core`, (c) call the appropriate store setters. A page or component invokes an api function on mount or on user action, not a store method that does network work.

**What it protects against:**
- **Year 3:** Components stay trivially testable — replace a store with a mock, no network mocking needed.
- **Year 5:** Changing the network layer (e.g., REST to GraphQL, or GraphQL client swap) is a change to `sdk/api` alone — stores and components don't move.
- **Year 10:** The reactivity model still makes sense because stores are simple enough to reason about. Complex reactive state with implicit side effects becomes unreadable; this pattern keeps it readable.

**Standards:**
- Stores expose `set*` methods for every field they track; no domain logic inside setters
- `sdk/api` operations follow a consistent pattern: network call → validation → store update
- Loading and error state live in the relevant store (`itemStore.loading`, `itemStore.error`), so every component gets them for free

### 3.4 Perspectives via Capabilities, Not Role Enums

**Pattern:** Capability-Based Authorization on the Client

**Why:** The existing `UserRole = "user" | "manager" | "admin" | null` has a subtle bug: `null` means both "not logged in" and "logged in but no role" simultaneously. A four-value enum cannot represent a user who is both a consumer and a producer (the Airbnb-style "switch to hosting" pattern common in two-sided platforms). Capabilities as a set solve both problems: absence of a user object means guest, presence with `["consume"]` means pure consumer, presence with `["consume", "produce"]` means dual-capable.

**How it's applied:** `authStore.user` is `User | null`. A `User` has `capabilities: Capability[]` where `Capability = "consume" | "produce" | "admin"`. Route guards and UI visibility check capability presence, not role equality. The active perspective (which *view* of a dual-capable user's world is currently shown) lives in `uiStore.activePerspective` and is mutated by the `PerspectiveToggle` component.

**What it protects against:**
- **Year 3:** Adding a new capability (e.g., `moderate`) is a one-line change to the enum and additive updates to guards, not a restructuring of the role system.
- **Year 5:** The dual-capable user pattern works natively — no "sub-accounts" workaround.
- **Year 10:** The capability model aligns with how permissions actually work in production systems (RBAC is capability-based under the hood anyway).

**Standards:**
- Guards are named helpers: `requireAuth`, `requireCapability("produce")`, `requireOwnership(item)`. Not inlined conditionals.
- `authStore.isGuest`, `authStore.canConsume`, `authStore.canProduce` are derived getters for common checks
- The perspective toggle is only rendered when the user holds both `consume` and `produce`

### 3.5 Route Structure: Clean Paths, UI-Level Guards

**Pattern:** Unified Routes with Role-Adaptive UI

**Why:** Prefixing routes with the perspective (`/guest/items/:id`, `/consumer/items/:id`) duplicates paths and forces the client to decide before render what perspective applies. This is fragile when users hold multiple capabilities or switch mid-session. A single `/items/:id` that adapts its UI based on the current capability set is more honest about how the system works: one piece of content, multiple views.

**How it's applied:** Explorer has exactly five routes: `/` (discover, public), `/auth` (login/signup, public), `/items/:id` (detail, public read + auth-gated write affordances), `/items/new` and `/items/:id/edit` (both share the same page component with different param handling, producer-guarded), `/me` (dashboard, authenticated, perspective-aware). Guards run in SvelteKit's `+page.ts` or `+layout.ts` load functions; write affordances on shared pages are conditionally rendered based on `authStore` state.

**What it protects against:**
- **Year 3:** A user who gains producer capability mid-session doesn't need to log out and back in — the same URLs they were on show the new affordances.
- **Year 5:** Deep-linked content (sharing `/items/:id`) works for everyone, because there's no role prefix to get wrong.
- **Year 10:** The route map is small enough to memorize, which matters for a template.

**Standards:**
- Never more than five routes in Explorer — adding a sixth requires deleting an existing one or a documented exception
- Guards live in `+page.ts` / `+layout.ts` for redirects; conditional UI lives in `.svelte` files
- Unauthenticated users land on `/auth?redirect=<original>` when hitting a guarded route

### 3.6 Hardcoded Auth with Integration TODOs

**Pattern:** Stub-with-Markers

**Why:** A template needs to be runnable end-to-end without requiring the author to set up JWT, sessions, and OAuth before anything else works. Hardcoding auth in development lets every other subsystem (stores, api, routes, guards) be exercised against a predictable user. Marking every hardcoded decision with `TODO(auth):` makes the integration path obvious later.

**How it's applied:** `authStore.svelte.ts` initializes with a hardcoded user — typically a producer with both `consume` and `produce` capabilities — so that every screen renders its richest state on page load. A `// TODO(auth): replace with JWT-derived identity from /auth endpoint` comment sits above the hardcoded value. The `login` function in `sdk/api` is a stub that resolves with the same hardcoded user; a `// TODO(auth): wire to real /login mutation` marks it. A dev-only route (e.g., `/dev/switch-role`, gated by env) lets the developer swap perspectives without integrating real auth.

**What it protects against:**
- **Year 3:** Forks can run the template immediately, even before wiring their own auth provider.
- **Year 5:** The integration diff is small and obvious because every hardcoded site is marked.
- **Year 10:** The pattern of "stub with markers" remains a useful tool for any subsystem that blocks development.

**Standards:**
- Every hardcoded auth value has a `TODO(auth):` comment
- Hardcoded values favor the richest state (producer with full capabilities) so screens render fully
- A dev-only capability switcher exists for testing guards without real auth

### 3.7 Empty State as a First-Class Render State

**Pattern:** Honest Empty States

**Why:** A template that ships with demo data — fake items, hardcoded metrics, placeholder comments — teaches forks to hardcode too. The first time a fork runs against a real empty database, screens explode or lie. Designing every screen to render honestly with zero data forces the right architecture from day one: no hardcoded constants, no "if no data, use this fixture" fallbacks, no screens that pretend to have content they don't.

**How it's applied:** Every list in Explorer uses `EmptyState` from `sdk/ui` with a neutral message when empty ("No items yet" — not "Add your first item!" which is app-real copy). Every metric reads from a store; if the store's value is `null` or `0`, the UI shows `—` or `0`, not a fake number. Every map without points renders the base map with a non-intrusive message. Every chart without data shows its axes with an empty plot and a caption.

**What it protects against:**
- **Year 3:** Forks start with real data flows from day one; no stripping of demo fixtures.
- **Year 5:** The codebase stays honest because "screen works with zero data" is a testable property.
- **Year 10:** The template remains forkable because its surface is data-neutral.

**Standards:**
- Zero `const items = [...]` arrays in any component file
- Zero placeholder strings like "Lorem ipsum" or domain-specific demo copy
- Every list, counter, and metric has a documented empty-state rendering

### 3.8 Cross-Cutting Concerns

**Error Handling:** `sdk/api` catches network errors, validates responses against Zod schemas from `sdk/core`, and writes errors to the relevant store (`itemStore.error`, `commentStore.error`). Components read `store.error` and render via the `EmptyState` primitive with an error variant. No `try/catch` in components; all error surfaces are declarative.

**Loading States:** Every store exposes `loading: boolean`. Components render a skeleton or spinner when loading. `sdk/api` sets `loading = true` before a call, `loading = false` after. No ad-hoc loading booleans inside components.

**Logging:** Browser-side logging is minimal — warn-level for unexpected conditions, error-level for failed network calls. No `console.log` left in production code. A single `logger` helper in `sdk/core` wraps console with level control.

**i18n:** Paraglide is already set up per-app. New strings added to screens go into `messages/en.json` in the relevant app's i18n project. No string literals in component markup.

---

## 4. Component Map & Directory Structure

### 4.1 SDK Package Inventory

**`sdk/pkgs`** — Generated types and compiled artifacts consumed from the server's derivation outputs.

- **Location:** `src/client/sdk/pkgs/`
- **Exposes:** Re-exports of proto-generated TS (entities `User`, `Item`, `Comment`, `Coordinates`; enums `Capability`, `ItemStatus`); re-exports of graphql-codegen output (typed document nodes for every query/mutation/subscription); the WASM module with its `.d.ts` (`validate_email`, `normalize_slug`, `compute_engagement_score`, `validate_coordinates`).
- **Consumes:** Nothing from the client SDK. Sources are external: `server/proto/`, `server/.../schema.graphql`, `server/.../wasm/`.
- **Must NOT:** Contain any hand-authored type definitions. Contain any runtime logic beyond what WASM provides. Depend on Svelte, DOM, or any other package in the SDK.

**`sdk/core`** — Client-side types, schemas, and pure utilities.

- **Location:** `src/client/sdk/core/`
- **Exposes:** Re-exports of `pkgs` entity types under convenient names; Zod schemas matching each entity for runtime validation at the wire boundary; pure utilities (`formatDate`, `buildItemUrl`, `slugify` — the last of which delegates to the WASM function from `pkgs`).
- **Consumes:** `sdk/pkgs`.
- **Must NOT:** Make network calls. Import from Svelte. Contain stateful logic.

**`sdk/api`** — Network clients and operation wrappers.

- **Location:** `src/client/sdk/api/`
- **Exposes:** A configured GraphQL client (URQL instance with subscription support); a configured Connect-TS client for the sidecar; named operation functions (`fetchItems`, `searchItems`, `fetchItem`, `createItem`, `updateItem`, `deleteItem`, `likeItem`, `unlikeItem`, `commentOnItem`, `subscribeToItem`, `generateDocument`, `getDocumentStatus`, `login`, `logout` — the last two are stubs with TODO markers).
- **Consumes:** `sdk/core`, `sdk/pkgs`. Stores are accessed to write results (one-way dependency: api writes to state, state never imports api).
- **Must NOT:** Own state (uses stores for that). Be called from components directly — operations are called from page-level load functions and from store-action composites.

**`sdk/state`** — Svelte rune stores.

- **Location:** `src/client/sdk/state/`
- **Exposes:**
  - `authStore` — `{ user, capabilities, isGuest, canConsume, canProduce, canAdmin, activePerspective, setUser, setActivePerspective, logout }`. Hardcoded with TODOs.
  - `itemStore` — `{ all, selected, loading, error, setItems, selectItem, setLoading, setError, upsertItem, removeItem }`.
  - `commentStore` — `{ forActiveItem, loading, error, setComments, addComment, removeComment, setLoading, setError }`.
  - `uiStore` — `{ activePerspective, searchQuery, mapViewport, setActivePerspective, setSearchQuery, setMapViewport }`.
- **Consumes:** `sdk/core`, `sdk/pkgs`.
- **Must NOT:** Call the network. Import from `sdk/api`. Contain business logic beyond simple state updates.

**`sdk/ui`** — Shared presentational components.

- **Location:** `src/client/sdk/ui/`
- **Exposes:**
  - *Primitives (existing, kept):* `GlassCard`, `GlassContainer`, `FormInput`, `FormSelect`, `SubmitButton`, `EmptyState` (with neutral default icon), `StatusBadge`, `ImageWithFallback`.
  - *Layout (existing, generalized):* `Navbar`, `BottomNav`, `Footer`, `DynamicBackground`, `Navigation`.
  - *Landing (existing):* `Hero`.
  - *Admin (existing, trimmed):* `AdminDashboard`, `AdminProfile` — demo arrays removed, copy made neutral.
  - *Domain (new):* `ItemCard` (renders an `Item` in list/grid contexts), `PerspectiveToggle` (navbar widget for switching Consumer/Producer view, only rendered when user holds both capabilities).
  - *Actions:* `tilt` (existing).
  - *Icons:* `ICONS` map, `NAV_ICONS` map.
  - *i18n:* Paraglide messages.
- **Consumes:** `sdk/state` (for `authStore` and `uiStore` reads in layout components), `sdk/core`, `sdk/pkgs`.
- **Must NOT:** Call `sdk/api` directly. Contain domain logic. Hardcode demo data.

### 4.2 Apps Inventory

**`apps/vision`** — Admin lab (substantially complete).

- **Location:** `src/client/apps/vision/`
- **Purpose:** Developer and admin-facing tool for inspecting the client's internals and managing platform operations.
- **Exposes:** The existing 4-quadrant page (StoresMirror, InteractionDeck, Showcase, PersistenceInspector) built on rune-lab.
- **Consumes:** Full SDK.
- **Changes needed in this spec:** Remove hardcoded Spanish copy in `AdminProfile` (already in `sdk/ui`, same component); remove `securityItems` and `metrics` arrays in favor of real store subscriptions or honest empty states; remove XIBALBA/SYSTEM_LEVEL references.
- **Must NOT:** Be conflated with Explorer. Vision's layout assumptions (sidebar, command palette, keyboard-heavy UX) don't belong in Explorer.

**`apps/explorer`** — End-user showroom exercising three perspectives.

- **Location:** `src/client/apps/explorer/`
- **Purpose:** The forkable starting point for real applications. Demonstrates Guest/Consumer/Producer flows against the full server stack.
- **Routes (exhaustive):**
  1. `/` — Discover. Public landing with search, map view, and item list. Hero for unauthenticated visitors; abbreviated when authenticated.
  2. `/auth` — Login/Signup. Single form with toggle between modes. Currently calls hardcoded stub; TODO-marked for real integration.
  3. `/items/:id` — Item detail. Public read. Shows comments, likes, location. Authenticated users see like button and comment form. Producer-owners see edit/delete buttons. Live-updates comment count and comments via GraphQL subscription.
  4. `/items/new` and `/items/:id/edit` — Item create/edit. Producer-guarded; routes back to `/` for unauthorized users. Shared page component keyed on route param.
  5. `/me` — User dashboard. Authenticated. Adapts to active perspective: Consumer view shows saved items and recent activity; Producer view shows owned items with engagement metrics; dual-capable users see the `PerspectiveToggle` in the navbar.
- **Consumes:** Full SDK.
- **Must NOT:** Add a sixth route without deleting one. Hardcode data in any page. Import anything from `apps/vision/`.

### 4.3 Directory Tree (Delta from Current)

Showing only *changes* from the current client tree. Unchanged paths are omitted.

```
src/client/
├── sdk/
│   ├── core/
│   │   └── src/
│   │       ├── mod.ts                    # UPDATED: re-export from pkgs
│   │       ├── schemas/                  # NEW: Zod schemas for validation
│   │       │   ├── item.ts
│   │       │   ├── user.ts
│   │       │   └── comment.ts
│   │       └── utils/                    # NEW: pure helpers
│   │           ├── format.ts
│   │           └── url.ts
│   │
│   ├── api/                              # NEW PACKAGE
│   │   ├── package.json
│   │   └── src/
│   │       ├── mod.ts
│   │       ├── clients/
│   │       │   ├── gql.ts                # URQL instance + config
│   │       │   └── rpc.ts                # Connect-TS client config
│   │       └── operations/
│   │           ├── items.ts              # fetchItems, createItem, ...
│   │           ├── comments.ts           # commentOnItem, subscribeToItem
│   │           ├── documents.ts          # generateDocument via RPC
│   │           └── auth.ts               # login/logout stubs with TODOs
│   │
│   ├── state/
│   │   └── src/
│   │       ├── mod.ts                    # UPDATED: export all stores
│   │       └── stores/
│   │           ├── auth.svelte.ts        # UPDATED: capabilities-based,
│   │           │                         # hardcoded with TODO(auth):
│   │           ├── item.svelte.ts        # KEPT AS-IS
│   │           ├── comment.svelte.ts     # NEW
│   │           └── ui.svelte.ts          # NEW
│   │
│   ├── ui/
│   │   └── src/
│   │       └── components/
│   │           ├── admin/
│   │           │   └── AdminProfile.svelte   # UPDATED: demo data removed
│   │           ├── layout/
│   │           │   └── Navbar.svelte         # UPDATED: reads capabilities
│   │           └── domain/                   # NEW CATEGORY
│   │               ├── ItemCard.svelte
│   │               ├── PerspectiveToggle.svelte
│   │               └── mod.ts
│   │
│   └── pkgs/                             # NEW PACKAGE
│       ├── package.json
│       └── src/
│           ├── mod.ts                    # Re-exports from generated dirs
│           ├── proto/                    # @generated, from server proto
│           ├── graphql/                  # @generated, from server schema
│           └── wasm/                     # @generated, from server WASM
│
└── apps/
    ├── vision/                           # UPDATED: brand leakage removed
    │
    └── explorer/                         # NEW APP
        ├── package.json
        ├── svelte.config.js
        ├── tsconfig.json
        ├── vite.config.ts
        └── src/
            ├── app.html
            ├── app.d.ts
            ├── hooks.ts
            ├── routes/
            │   ├── +layout.svelte        # Navbar + BottomNav + Footer
            │   ├── +layout.ts
            │   ├── +page.svelte          # / (Discover)
            │   ├── auth/
            │   │   └── +page.svelte      # /auth
            │   ├── items/
            │   │   ├── [id]/
            │   │   │   ├── +page.svelte  # /items/:id
            │   │   │   ├── +page.ts      # (guards, load)
            │   │   │   └── edit/
            │   │   │       └── +page.svelte  # /items/:id/edit
            │   │   └── new/
            │   │       └── +page.svelte  # /items/new
            │   └── me/
            │       ├── +page.svelte      # /me (dashboard)
            │       └── +page.ts
            └── lib/
                └── components/           # App-specific composition
                    ├── ItemForm.svelte   # Used in new + edit
                    ├── ItemDetail.svelte # Used in /items/:id
                    ├── DiscoverGrid.svelte
                    └── DashboardView.svelte
```

---

## 5. Trade-off Analysis

### 5.1 Five Packages vs. Fewer, Broader Ones

```
DECISION: Five SDK packages (pkgs, core, api, state, ui) vs. alternatives
OPTIONS CONSIDERED:
  A. Five packages — strict layering, generated content isolated, clear
     dependency direction. Cost: more package.json files, slightly more
     setup ceremony.
  B. Three packages (the current core/state/ui) — simpler structure,
     but generated content has nowhere clean to live and network calls
     leak across boundaries.
  C. Two packages (sdk + apps) — absolute minimum ceremony, but no
     architectural guarantees about what can import what.
  D. Single-package SDK with directory-level separation — one
     package.json, directories for each concern. Simpler but gives up
     the import-boundary enforcement that monorepo tooling provides.
CHOSEN: A (Five packages)
REASON: The cost of an extra package.json is trivial; the value of
  enforced layering is substantial. More importantly, `pkgs` NEEDS to be
  a separate package because it contains generated content with
  different lifecycle concerns (regenerated on server changes, not on
  client edits). Lumping it into `core` blurs that boundary. The extra
  two packages (api, pkgs) are exactly the ones that close the current
  architectural gaps; omitting them would perpetuate the problems.
REVISIT IF: The template grows so large that five packages feels
  under-specified (unlikely), or so tiny that even five feels heavy
  (also unlikely — apps always push toward more structure, not less).
```

### 5.2 `api` as Standalone Package vs. Inside `state`

```
DECISION: sdk/api is its own package, not a submodule of sdk/state
OPTIONS CONSIDERED:
  A. sdk/api as standalone — explicit layer, no state coupling, can be
     tested without stores, can be used from non-Svelte consumers later.
  B. api logic lives inside sdk/state — stores own their fetch logic;
     simpler for small apps; but every store grows network concerns
     and testing each store requires mocking the network.
  C. api logic lives inside apps/explorer — no shared layer;
     each app writes its own fetch code; maximum flexibility,
     maximum duplication.
CHOSEN: A (Standalone sdk/api)
REASON: The current codebase's biggest structural gap is precisely
  that there's no network layer — stores have setters but nothing to
  call them. Putting network logic inside stores would solve the
  immediate problem but create the classic "component mounts, store
  triggers fetch" coupling that becomes untestable at scale. A
  standalone api package makes the network a first-class layer that
  can be mocked, logged, rate-limited, or swapped wholesale without
  touching state. It also means a future non-Svelte consumer (e.g.,
  a Tauri window with plain TS, or a test runner) can use `sdk/api`
  directly.
REVISIT IF: The api package accumulates stateful concerns (caching,
  retry policies with backoff). If that happens, extract those into
  `sdk/api/infrastructure/` rather than merging into `state`.
```

### 5.3 Route Structure: Clean Paths vs. Role-Prefixed

```
DECISION: Single route tree with UI-level guards, not role-prefixed routes
OPTIONS CONSIDERED:
  A. Clean routes (`/items/:id`) with UI adaptation — same URL for
     everyone, conditional rendering based on authStore. Matches how
     real-world apps work. Five routes total.
  B. Role-prefixed routes (`/guest/items/:id`, `/consumer/items/:id`)
     — explicit about perspective, duplicative in practice. Fifteen
     routes for three perspectives × five screens.
  C. Separate layouts per role — no URL duplication, but every page
     has to be authored three times (one per layout). Invisible to
     users, painful for authors.
CHOSEN: A (Clean routes)
REASON: The user explicitly called out that routes shouldn't be
  redundant, and the practical evidence is on their side. Real-world
  two-sided platforms (Airbnb, Etsy, eBay) use unified routes with
  UI adaptation; the role-prefixed pattern is mostly seen in legacy
  enterprise portals where admin and customer experiences diverge
  completely. For a template that teaches "here is a forkable
  two-sided-platform scaffold," clean routes are the right lesson.
  UI guards via helpers (requireAuth, requireCapability) keep the
  code inspectable.
REVISIT IF: The admin experience grows to share most of its surface
  with the consumer experience — at that point, admin might move
  into Explorer as a fourth perspective rather than staying in Vision.
  But that's speculative and far off.
```

### 5.4 Hardcoded Auth Now vs. Real Auth From Day One

```
DECISION: authStore starts hardcoded with TODO markers; real auth later
OPTIONS CONSIDERED:
  A. Hardcoded user with TODO(auth): markers — every other subsystem
     exercises its full surface without blocking on auth infrastructure.
     The integration path is visibly marked.
  B. Real JWT-based auth from day one — correct end-state, but blocks
     every other feature until /login, session management, token
     refresh, and guards are all functional. Template becomes "can't
     run until you wire this."
  C. Feature flag: hardcoded in dev, real in prod — two code paths,
     two bug surfaces, template forks pay for infrastructure they
     might not want.
CHOSEN: A (Hardcoded with TODOs)
REASON: The user explicitly requested this path. More importantly,
  it's the right call for template development. A template that
  can't be run without first implementing auth is a template that
  stays in draft. Hardcoded auth with visible markers ships today and
  the integration is a well-defined future change with a single
  concern per marker.
REVISIT IF: Never, as stated. This is a transitional state; the
  TODO markers are the revisit mechanism.
```

### 5.5 Vision Stays, Trimmed; Explorer Is New

```
DECISION: Keep Vision as an admin lab; build Explorer as the 3-perspective app
OPTIONS CONSIDERED:
  A. Two apps (Vision + Explorer) — clear separation of concerns,
     one app per audience, clean mental model.
  B. Merge into one app — every route lives in one tree; admin
     features hidden behind capability guards. Saves some setup.
  C. Vision only, with Explorer features bolted on — pragmatic but
     couples admin and user UX; rune-lab's WorkspaceLayout is wrong
     for mobile consumers.
CHOSEN: A (Two apps, distinct purposes)
REASON: Vision is already a functional lab; tearing it apart to
  merge with Explorer would be pointless destruction. The two
  audiences (admin/developer vs. end-user) have fundamentally
  different UX needs: keyboard-heavy desktop with command palettes
  vs. mobile-first touch-driven browsing. One app can't serve both
  without compromising both. Most real-world forks will keep
  Explorer and drop Vision (or keep Vision as internal tooling);
  that's the correct lifecycle.
REVISIT IF: A fork consistently wants an integrated admin surface
  inside their main app. At that point, some patterns from Vision
  can be extracted into sdk/ui admin components and composed into
  an Explorer admin route gated by the `admin` capability.
```

### 5.6 Generated Artifacts: Committed vs. Gitignored

```
DECISION: Commit all generated artifacts in sdk/pkgs
OPTIONS CONSIDERED:
  A. Commit generated files — reviewers see the diff when server
     types change; builds are deterministic from fresh clone; fitness
     function can verify no hand-edits.
  B. Gitignore generated files, regenerate on install — smaller
     repo; cleaner git history; but server/client type drift becomes
     invisible in PR review.
  C. Commit a manifest (hash of source files), regenerate if mismatch
     — compromise; adds complexity without clear benefit.
CHOSEN: A (Commit generated files)
REASON: Type changes are API changes and deserve visible review.
  "The User type gained a `lastLoginAt` field" should appear as a
  diff in the PR that caused it. Build determinism is a bonus —
  fresh clones work without a codegen step. The one argument for
  Option B (repo size) doesn't apply here because generated TS from
  proto and GraphQL is small, and the WASM blob is a single file.
REVISIT IF: Generated content grows into megabytes (unlikely for
  this scope). Or if CI's codegen becomes reliable enough that
  committing them feels redundant (also unlikely — diffs remain
  valuable for review regardless).
```

### 5.7 Store Granularity: Four Stores vs. Consolidated

```
DECISION: Four stores (auth, item, comment, ui)
OPTIONS CONSIDERED:
  A. Four stores — each owns one concern; testing is isolated;
     reactive updates are scoped to the relevant store.
  B. One mega-store with nested state — single source of truth;
     but every component that touches one field re-renders on any
     state change unless carefully derived.
  C. Many tiny stores (per-screen stores) — extreme isolation; but
     the shared state patterns (active item selected across pages)
     would require cross-store coordination that gets messy fast.
CHOSEN: A (Four stores)
REASON: The four stores map to four natural concerns: who am I
  (auth), what's in the domain (item), what's active right now
  (comment, tied to selected item), what's the UI doing (ui).
  Svelte runes handle fine-grained reactivity correctly — a
  component that reads `itemStore.all` does not re-render when
  `itemStore.error` changes. Four is the right granularity;
  consolidating into fewer loses clarity, splitting into more
  creates coordination overhead.
REVISIT IF: A new major concern appears (e.g., notifications,
  real-time presence). Add a store for it; don't cram into ui.
```

---

## 6. Phased Implementation Plan

### Phase 1 — SDK Expansion (Skeleton)

**Goal:** The two new packages (`sdk/api`, `sdk/pkgs`) exist as workspace entries with correct dependency declarations and empty-but-runnable scaffolds. The layering rule is enforceable via lint.

**Components to build:**
- `sdk/api/package.json` with dependencies on `@sdk/core` and `@sdk/pkgs`
- `sdk/api/src/mod.ts` with placeholder exports
- `sdk/pkgs/package.json` with no internal SDK dependencies
- `sdk/pkgs/src/mod.ts` with placeholder exports
- Workspace manifest update to include both new packages
- ESLint config (or equivalent) declaring the allowed-imports rule per package
- `just client:lint-boundaries` fitness function verifying no forbidden imports

**Dependencies:** None — this is pure scaffolding.

**Exit criteria:**
- `bun install` succeeds across all five packages
- `just client typecheck` passes
- Attempting to import `sdk/api` from `sdk/core` fails lint
- Attempting to import `sdk/state` from `sdk/api` fails lint

**Risk flags:** Low. Purely structural work.

---

### Phase 2 — `sdk/api` with Hardcoded Auth

**Goal:** The api package has working GraphQL and Connect-TS clients, named operation functions for every item and comment mutation, and wires results into the existing (hardcoded) `authStore` and `itemStore`. The client can demonstrate a round-trip against a running server for non-auth operations.

**Components to build:**
- `sdk/api/src/clients/gql.ts` — URQL client instance with subscription support pointed at `http://localhost:3000/graphql`
- `sdk/api/src/clients/rpc.ts` — Connect-TS client pointed at `http://localhost:4000`
- `sdk/api/src/operations/items.ts` — `fetchItems`, `searchItems`, `fetchItem`, `createItem`, `updateItem`, `deleteItem`, `likeItem`, `unlikeItem`
- `sdk/api/src/operations/comments.ts` — `commentOnItem`, `subscribeToItem`
- `sdk/api/src/operations/documents.ts` — `generateDocument`, `getDocumentStatus`
- `sdk/api/src/operations/auth.ts` — `login`, `logout` (stubs with `TODO(auth):` markers)
- Update `authStore` to use capability-based model (`capabilities: Capability[]`), still hardcoded
- Add `commentStore` and `uiStore` to `sdk/state`
- Zod schemas in `sdk/core/src/schemas/` mirroring the entity types (for wire-boundary validation)

**Dependencies:** Phase 1. Server Phase 1 (minimum schema) must be functional for end-to-end verification.

**Exit criteria:**
- Calling `fetchItems()` from a REPL or test file populates `itemStore.all` with data from a running server
- Calling `likeItem(itemId)` from a user with hardcoded producer capabilities succeeds against the server
- `subscribeToItem(itemId)` yields comment-count updates as other clients comment (verify with two browser tabs)
- All stub auth functions have `TODO(auth):` comments citing the integration path
- Zod validation catches a deliberately malformed response (spike test)

**Risk flags:**
- [MEDIUM RISK] URQL subscription setup requires WebSocket-capable transport; verify the server's GraphQL subscription endpoint is reachable and compatible.
- Connect-TS client version must align with the server's protobuf toolchain (avoid the v1/v2 mismatch seen in server test output).

---

### Phase 3 — `sdk/pkgs` as Server-Derivation Consumer

**Goal:** All entity types consumed by the client are generated from server sources rather than hand-authored. The WASM module produced by the server is callable from the browser.

**Components to build:**
- `sdk/pkgs/src/proto/` populated by `protoc-gen-es` from `server/proto/template/v1/*.proto`
- `sdk/pkgs/src/graphql/` populated by `graphql-codegen` from `server/engine/services/gateway/schema.graphql`
- `sdk/pkgs/src/wasm/` populated by `wasm-pack build --target bundler` from `server/engine/services/wasm/`
- `sdk/pkgs/src/mod.ts` — curated re-exports with convenient names
- `just client:codegen` aggregate command invoking the three generators
- Update `sdk/core` entity exports to re-export from `sdk/pkgs` (deleting the hand-authored `comment.ts` and `item.ts`)
- Fitness function `just client:codegen-check` — regenerate and `git diff --exit-code`

**Dependencies:** Server Phase 2 (protobuf entities) and Server Phase 4 (schema export) must land first. Server Phase 3 (WASM) should land for the wasm module, but the graphql+proto path can be tested independently if WASM slips.

**Exit criteria:**
- `sdk/core/src/entities/` no longer contains hand-authored files (replaced by re-exports from pkgs)
- `sdk/api` operations use graphql-codegen-generated document nodes (`ItemsDocument`, `LikeItemDocument`, etc.) rather than raw strings
- A call to `validate_email` from the browser uses the WASM export
- Changing a field in `server/proto/template/v1/entities.proto`, running `just client:codegen`, and seeing the TypeScript type change in `sdk/pkgs` is verified by a spike
- `just client:codegen-check` passes in CI

**Risk flags:**
- [MEDIUM RISK] `wasm-pack --target bundler` output may require vite config adjustments for Svelte. Spike this before committing.
- `graphql-codegen` has many plugins; choose minimal ones (typescript, typescript-operations). More exotic plugins create more failure modes.
- Proto and GraphQL codegen may produce naming collisions (both generate a `User` type). Disambiguate in the `mod.ts` re-export.

---

### Phase 4 — Explorer Shell (Five Routes + Guards + Perspective Toggle)

**Goal:** Explorer is a functional SvelteKit app with exactly five routes, capability-based guards, the perspective toggle, and honest empty states. It reads from stores populated by `sdk/api` and renders correctly with zero data, hardcoded-auth data, and live-data states.

**Components to build:**
- `apps/explorer/` scaffolded like `apps/vision/` with SvelteKit + Paraglide + Tailwind/DaisyUI
- Layout: `+layout.svelte` with `Navbar`, `BottomNav`, `Footer`, `DynamicBackground`
- Route `/` (Discover): search, map, item list — composes `DiscoverGrid.svelte` reading from `itemStore`
- Route `/auth`: login/signup form — stub login on submit
- Route `/items/:id`: `ItemDetail.svelte` composes `ItemCard`, comment list, like button, subscription lifecycle
- Route `/items/new` and `/items/:id/edit`: shared `ItemForm.svelte`; guard via `requireCapability("produce")`
- Route `/me`: `DashboardView.svelte` adapts based on `uiStore.activePerspective`
- Guards as named helpers in `apps/explorer/src/lib/guards.ts`: `requireAuth`, `requireCapability`, `requireOwnership`
- New shared components in `sdk/ui/components/domain/`: `ItemCard.svelte`, `PerspectiveToggle.svelte`
- Updated `Navbar` to read `authStore.capabilities` and conditionally render `PerspectiveToggle`
- Updated `BottomNav` to adapt items based on active perspective
- Every page verified to render honestly with empty data (via DevTools, clear the store, confirm `EmptyState` appears)

**Dependencies:** Phase 2 (api is wired). Phase 3 helpful but not strictly required — hand-authored types in `sdk/core` are acceptable placeholders until Phase 3 lands.

**Exit criteria:**
- All five routes are navigable
- Guards redirect correctly: unauthenticated user hitting `/items/new` lands on `/auth?redirect=/items/new`
- Producer-capable hardcoded user sees `PerspectiveToggle` in navbar; switching changes `/me` content
- Consumer-only hardcoded user doesn't see `PerspectiveToggle` (spike by flipping the hardcoded capabilities in authStore)
- Every screen renders correctly when its store is empty — confirmed by a Vitest test that mounts each page with empty stores
- Live subscription: `/items/:id` comment count updates when another client comments (two-tab test)

**Risk flags:**
- [MEDIUM RISK] SvelteKit's `+page.ts` load functions run on both server (SSR) and client. For a mostly-client app, setting `ssr = false` globally is fine; otherwise some guards need both paths.
- The `PerspectiveToggle` rendering rule (show only when both capabilities present) has three cases; make sure all three are tested.

---

### Phase 5 — Trim, Document, and Enforce

**Goal:** The client is template-clean: no hardcoded brand references, no demo data in any shared component, fitness functions enforce layering and codegen freshness in CI, and documentation makes the fork ritual clear.

**Components to build:**
- Remove XIBALBA, Spanish-only copy, and `securityItems`/`metrics` arrays from `AdminProfile`
- Replace `EmptyState`'s default `Utensils` icon with a neutral default (e.g., `Inbox` or `Box`)
- Add header comments to every file in `sdk/pkgs/src/proto/`, `graphql/`, `wasm/`: `// @generated · do not edit`
- Add `just client:sync-check` aggregate fitness function: boundaries + codegen-check + typecheck
- Wire `just client:sync-check` into CI
- Author `src/client/ARCHITECTURE.md` — the five packages, two apps, perspective model
- Author `src/client/FORKING.md` — the checklist for adapting the template (rename apps, update theme, wire auth, add first domain-specific route)
- Update `src/client/README.md` to point at the above
- Neutral branding throughout — the template ships as "GWA Template" or similar, not as a specific product name

**Dependencies:** Phases 1–4 complete.

**Exit criteria:**
- `rg -i 'xibalba|comercios|administrador_root'` returns zero hits in `src/client/`
- No `const items = [...]` or similar hardcoded demo arrays in `sdk/ui/`
- `just client:sync-check` is green and runs in CI
- A new contributor can read `ARCHITECTURE.md` and `FORKING.md` and understand where to add a field, wire a new route, or rename the demo entity

**Risk flags:** Low — documentation and cleanup phase.

---

## 7. Implementation Management

### 7.1 Sequencing & Critical Path

```
Phase 1 (SDK skeleton) ──────┐
                             ▼
Phase 2 (sdk/api) ───── parallel with Phase 3 ───┐
                             │                    │
                             ▼                    ▼
Phase 4 (Explorer) ──────────┘                    │
                             │                    │
                             └──── waits on ──────┘
                             ▼
Phase 5 (trim & docs) ───────┘
```

Critical path for a single engineer: Phase 1 → Phase 2 → Phase 4 → Phase 5. Phase 3 can run in parallel with Phase 2 if two engineers are available, or slotted between Phase 2 and Phase 4 if solo. Phase 4 can begin with hand-authored types from `sdk/core` (pre-Phase-3 state) and swap to generated types once Phase 3 lands — don't block Phase 4 waiting for Phase 3.

### 7.2 Ownership Suggestions

| Phase | Best Owner | Rationale |
|---|---|---|
| 1 | Any frontend engineer | Pure structural/tooling work |
| 2 | Frontend engineer comfortable with URQL or similar | GraphQL client wiring is the main skill |
| 3 | Frontend engineer comfortable with codegen pipelines | `graphql-codegen`, `wasm-pack`, `protoc-gen-es` all have sharp edges |
| 4 | Frontend engineer with SvelteKit routing experience | SvelteKit's `+page.ts` / `+layout.ts` conventions matter |
| 5 | Technical writer or lead | Documentation quality is the deliverable |

Shared ownership of `sdk/ui` is important — components added for Explorer may need to be consumed by Vision later; keep the UI package generic.

### 7.3 Integration Points

- **Server schema export freshness** — `sdk/pkgs/src/graphql/` depends on `server/engine/services/gateway/schema.graphql`. If server and client are in separate checkouts, coordinating regeneration is a human-process concern. Mitigation: both live in the same monorepo (they do); a single `just sync-check` at the repo root invokes both server and client codegen.
- **Proto toolchain alignment** — Connect-TS on client and `tonic-prost` on server must agree on proto3 semantics. Mitigation: server Phase 2 establishes the v2 baseline; client Phases 2 and 3 assume that baseline.
- **Svelte runes `$state`** — SvelteKit + rune stores is a newer pattern. Some runtime quirks (e.g., server-side rendering of rune state) may surface. Mitigation: `apps/explorer/src/routes/+layout.ts` sets `ssr = false` to sidestep this entirely; the template is a mostly-client app.
- **Authentication integration later** — the `TODO(auth):` markers are the handoff point. When real auth lands, grep for the markers and replace each one with the actual integration. Mitigation: markers are distinctive enough to find via `rg 'TODO\(auth\):'`.

### 7.4 Breaking Changes

| Decision | Reversal Cost | Mitigation |
|---|---|---|
| Five-package SDK structure | Medium — collapsing packages is mechanical but touches every import | Commit early; don't reshuffle after Phase 1 without strong reason |
| Capability-based auth model in `authStore` | Low — additive, doesn't break existing code | Old `role` field can be computed from capabilities if needed |
| Route structure (five routes) | Low — adding routes is easy; removing later is fine | Document the five-route ceiling; exceptions require explicit justification |
| Generated `sdk/pkgs` committed | Low — trivially reversible by gitignoring | Keep committed for diff review; revisit only if file sizes balloon |
| Vision kept separate from Explorer | Low — merging later is possible but rarely worthwhile | Two apps is the stable configuration |

None of these are one-way doors. The biggest commitment is the five-package structure — adopted in Phase 1 and assumed by every subsequent phase. Revert cost grows with time, so the decision is most affordable if made and honored from the start.

---

## 8. Validation & Testing Strategy

### 8.1 Layer-by-Layer Verification

| Layer | Test Type | What It Verifies | Tool |
|---|---|---|---|
| `sdk/pkgs` | Build-time | Generated artifacts compile; re-exports type-check | `tsc --noEmit` |
| `sdk/core` | Unit tests | Zod schemas accept valid wire data, reject invalid | `bun test` |
| `sdk/api` | Integration tests | Operations return expected shapes; subscriptions deliver events | Vitest against a live dev server, reusing existing `tests/integration/` harness |
| `sdk/state` | Unit tests | Store setters update state; derived getters compute correctly | Vitest with rune-test-adapter |
| `sdk/ui` | Visual tests | Components render correctly with empty, loading, error, and populated props | Storybook or Histoire (future) — for now, Vision's `Showcase` is the testbed |
| `apps/explorer` | E2E tests | Five routes navigate correctly, guards redirect, perspective toggle works | Playwright or Vitest browser mode (future; skeleton for now) |
| Architecture itself | Fitness functions | Import boundaries, codegen freshness, no hardcoded data | Custom scripts + ESLint |

### 8.2 Architecture Fitness Functions

The fitness functions are the soul of the template discipline. Without them, "no hardcoded data" and "respect the layering" are aspirations; with them, they're enforced.

**`just client:lint-boundaries`** — Parses every `package.json` in the SDK, verifies no forbidden imports exist. Fails CI if `sdk/core` imports from `sdk/state`, `sdk/ui` imports from `sdk/api`, etc.

**`just client:codegen-check`** — Regenerates `sdk/pkgs` content from server sources and diffs against committed files. Fails if anything differs. Catches (a) forgotten regeneration after server changes and (b) hand-edits to generated files.

**`just client:no-hardcoded-data`** — Greps component files for anti-patterns (`const [a-z]+ = \[`, specific project names like `XIBALBA`). Fails on any hit. Prevents demo data from creeping back in.

**`just client:typecheck`** — Existing; runs `svelte-check` across all apps and packages. Ensures generated types are consumed correctly.

**`just client:sync-check`** — Aggregate command running all four above. Local pre-commit gate; CI final gate.

### 8.3 Local Dev Validation

Before opening a PR, a client-side developer runs:

```
just client quality      # fmt + lint + typecheck (existing)
just client:sync-check   # all fitness functions
just client test         # unit tests (existing scaffold)
```

All three must be green. CI duplicates the same checks as the final gate.

### 8.4 Observability Strategy

Client-side observability is minimal by design — template forks will add their own analytics later.

- **Console logging:** A `logger` helper in `sdk/core` wraps `console` with level control. Warn on unexpected store state transitions; error on failed api calls. No `console.log` in production code.
- **Network errors:** `sdk/api` surfaces errors into the relevant store's `error` field. Components render them via `EmptyState` with an error variant.
- **Store state inspector:** Vision's `StoresMirror` already exists for development; it inspects the live contents of all stores. Useful during development but not a production concern.
- **Performance:** No performance budget enforced at the template level. Forks that need it add Lighthouse CI or Web Vitals tracking.

---

## 9. Open Questions & Risks

### 9.1 Unknowns

[ASSUMPTION] **GraphQL subscription transport.** URQL supports WebSocket subscriptions via `graphql-ws`. The server's async-graphql subscription endpoint must expose a compatible WebSocket handshake. Verify in Phase 2 spike.

[ASSUMPTION] **`wasm-pack --target bundler` + Vite compatibility.** Svelte + Vite typically consume WASM via the `?url` or `?init` suffix. The exact integration path may need a custom Vite plugin or explicit `optimizeDeps` configuration. Verify in Phase 3 spike.

[ASSUMPTION] **`graphql-codegen` with typed document nodes.** Using the `typescript-operations` plugin produces operation types but not all plugins compose cleanly. The chosen plugin set (`typescript`, `typescript-operations`, `typed-document-node`) is the most compatible with URQL but needs verification.

[ASSUMPTION] **Paraglide with five packages.** The existing setup has Paraglide per-app (Vision) and once in the UI SDK. Scaling this to Explorer doesn't introduce new complexity, but confirming Paraglide plays well with the expanded workspace is worth a quick check.

### 9.2 External Dependencies Carrying Risk

| Dependency | Risk Level | Contingency |
|---|---|---|
| URQL | Low | Active maintenance, widely used, well-documented |
| `@connectrpc/connect-web` | Low | Buf's official client, stable |
| `graphql-codegen` | Medium | Plugin ecosystem is sprawling; stick to core plugins |
| `wasm-pack` + `wasm-bindgen` | Low | Industry standard, stable |
| `tsify_next` | Medium | Younger; fall back to hand-typed WASM declarations if it stalls |
| SvelteKit with `ssr = false` | Low | Well-supported configuration for SPA-style apps |

### 9.3 Spike Recommendations

Before Phase 2 starts:

1. **Verify GraphQL subscription transport.** Stand up the URQL client against the server's existing subscription endpoint, observe one live event. 30 minutes of work; de-risks the entire live-update story.

Before Phase 3 starts:

2. **Verify `wasm-pack` + Vite integration.** Build the server's WASM crate with `--target bundler`, import the module in a toy Svelte component, call one exported function. 1–2 hours; de-risks the WASM consumption path.

3. **Verify `graphql-codegen` with the server's schema.** Run the generator against `schema.graphql`, inspect the output, use one generated type in a throwaway operation. 30 minutes; confirms the plugin set works.

Before Phase 4 starts:

4. **Verify SvelteKit `+page.ts` guards in SPA mode.** Build a two-route toy with a capability-based guard, confirm redirect works without SSR. 1 hour; the SvelteKit `ssr = false` path has edge cases worth discovering before committing to five routes.

### 9.4 The Template's Honest Limits

Three things this client architecture does not solve, and which should be documented as known limits rather than hidden:

**Real authentication is deferred.** The spec explicitly chooses to ship with hardcoded auth and `TODO(auth):` markers. A fork must implement its auth integration before going to production. This is a feature of the template, not a bug — but it's the single biggest gap a fork inherits.

**Offline behavior is unspecified.** The template assumes online operation. Caching strategies, optimistic updates, conflict resolution, and PWA offline support are all out of scope. Forks that need them add a service worker and a cache layer; the architecture accommodates this (sdk/api can be extended) but doesn't provide it.

**Accessibility is baseline, not exemplary.** The existing components use semantic HTML and DaisyUI's baseline a11y, but no systematic audit has been done. Forks serving regulated or enterprise markets will need to invest in accessibility as a separate workstream. The template does not pretend to be WCAG-compliant out of the box.

Acknowledging these limits keeps the spec honest. A template that claims to solve everything fails quietly in the places it oversold.

---

**End of Specification.**