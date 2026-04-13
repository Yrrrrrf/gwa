# 👁️ Project Template (Generic)

> **Modern Multi-Platform Starter.** A domain-agnostic foundation for building full-stack applications with type-safety and high performance.

## 🚀 Architecture

This template follows a strict **Layered & Hexagonal** architecture across multiple languages:

### Client (Deno + Svelte 5)
- **`apps/vision`**: Development showcase app for UI primitives and state testing.
- **`sdk/ui`**: Shared UI component library using Svelte 5 Runes.
- **`sdk/state`**: Reactive state management stores.
- **`sdk/core`**: Domain entities and business logic interfaces (TypeScript).

### Server (Rust + Go)
- **`engine/`**: The core business logic engine (Rust).
  - **`domain`**: Pure business rules and repository traits (Hexagonal/Ports).
  - **`store`**: Data persistence implementation (SurrealDB).
  - **`services/api`**: HTTP adapter layer (Axum).
- **`rpc/`**: High-performance compute plane (Go).
  - **`notifier`**: Async notification dispatcher (Email, SMS, Webhooks).

## 🛠️ Tech Stack

- **Frontend**: [SvelteKit 5](https://svelte.dev/) (Runes), [Deno](https://deno.com/), [TailwindCSS](https://tailwindcss.com/)
- **Backend**: [Rust](https://www.rust-lang.org/) ([Axum](https://github.com/tokio-rs/axum)), [Go](https://go.dev/) ([Echo](https://echo.labstack.com/))
- **Database**: [SurrealDB](https://surrealdb.com/)
- **Infrastructure**: [Docker Compose](https://www.docker.com/), [Nix](https://nixos.org/), [Just](https://github.com/casey/just)

## 🚦 Getting Started

### Prerequisites
- [Deno](https://deno.com/)
- [Rust](https://www.rust-lang.org/)
- [Go](https://go.dev/)
- [Just](https://github.com/casey/just)

### Development
```bash
# Start all services
just dev

# Run server tests
just server test

# Run client checks
just client typecheck
```

## 📂 Project Structure
```text
template/
├── src/
│   ├── client/          # SvelteKit + Deno SDK
│   │   ├── apps/        # Frontend applications
│   │   └── sdk/         # Shared libraries (core, state, ui)
│   └── server/          # Rust engine + Go RPC
│       ├── engine/      # Rust Hexagonal API
│       ├── rpc/         # Go Notification service
│       └── db/          # Database tests & tools
├── scripts/             # CI/CD & Dev scripts
└── docker-compose.yml   # Infrastructure orchestration
```
