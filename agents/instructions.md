# 🤖 AI Agent Instructions

> This document provides specific instructions for AI agents (like Gemini, Cursor, or GitHub Copilot) working within this monorepo.

## 🏗️ Architectural Mandates

### 1. Hexagonal Backend (Rust)
- All business logic MUST reside in `src/server/engine/core/domain/`.
- The `domain` layer MUST have zero dependencies on infrastructure (sqlx, axum, etc.).
- External services (DB, HTTP) MUST be implemented as Adapters in `core/store/` or `services/api/`.
- Use the **Ports & Adapters** pattern: `domain` defines traits (ports), `store` implements them.

### 2. Layered Frontend SDK (TypeScript)
- **`sdk/core`**: Type definitions only. Zero Svelte dependencies.
- **`sdk/state`**: Svelte 5 Runes for state management. No UI components.
- **`sdk/ui`**: Shared UI primitives.
- **Dependency Flow**: `ui` -> `state` -> `core`. Circular dependencies are strictly forbidden.

### 3. Generic Item Domain
- This template uses a generic `Item` entity as a placeholder.
- Fields: `id`, `title`, `description`, `status`, `tags`, `coordinates`, `rating`, `comment_count`, `created_at`, `updated_at`.
- Relations: `comment` (user → item), `likes` (user → item).
- Features: full-text search, popularity ranking, proximity searches, and graph-based recommendations.
- When adding new features, use `Item` and `Comment` as the reference implementation.

## 🛠️ Tech Stack Specifics

- **Svelte 5**: Use Runes (`$state`, `$derived`, `$props`, `$effect`) exclusively.
- **SurrealDB**: The primary database. Use SurQL for queries.
- **Axum**: The Rust web framework.
- **Deno**: The runtime for the client-side workspace.

## 🚦 Common Tasks

### Adding a new Entity
1. Define the struct in `engine/core/domain/src/entities/`.
2. Define a repository trait in `engine/core/domain/src/ports/`.
3. Implement the repository in `engine/core/store/src/repos/`.
4. Create a use-case or direct route in `engine/services/api/`.
5. Update the TypeScript SDK `core` and `state` packages to match.

### Adding a UI Component
1. Place generic primitives in `sdk/ui/src/components/primitives/`.
2. Use TailwindCSS for styling.
3. Ensure the component is exported from `sdk/ui/src/mod.ts`.
4. Showcase the component in `apps/vision/`.
