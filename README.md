# 👁️ Project Template (Generic)

> **Modern Multi-Platform Starter.** A domain-agnostic foundation for building
> full-stack applications with type-safety and high performance.

## 🚀 Architecture

This template follows a strict **Layered & Hexagonal** architecture with a
**GraphQL Gateway** and **gRPC Service Mesh**:

### Client (Deno + Svelte 5)

- **`apps/vision`**: Development showcase app for UI primitives and state
  testing.
- **`sdk/ui`**: Shared UI component library using Svelte 5 Runes.
- **`sdk/state`**: Reactive state management stores.
- **`sdk/core`**: Domain entities and business logic interfaces (TypeScript).

### Server (Rust + Go)

- **`engine/`**: The core business logic engine (Rust).
  - **`domain`**: Pure business rules and repository traits (Hexagonal/Ports).
  - **`store`**: Data persistence implementation (SurrealDB).
  - **`application`**: Transport-agnostic use case orchestration.
  - **`services/gateway`**: GraphQL Gateway (async-graphql + Axum).
- **`rpc/`**: Sidecar compute plane (Go).
  - **`notifier`**: Async notification dispatcher (gRPC).
  - **`documents`**: Document generation service (gRPC).
- **`proto/`**: Shared Protobuf contracts managed via **Buf**.

## 🛠️ Tech Stack

- **Frontend**: [SvelteKit 5](https://svelte.dev/) (Runes),
  [Deno](https://deno.com/), [Vanilla CSS]
- **Backend**: [Rust](https://www.rust-lang.org/), [Go](https://go.dev/)
- **API**: [GraphQL](https://graphql.org/) (External), [gRPC](https://grpc.io/)
  (Internal)
- **Database**: [SurrealDB](https://surrealdb.com/)
- **Infrastructure**: [Docker Compose](https://www.docker.com/),
  [Nix](https://nixos.org/), [Just](https://github.com/casey/just)

## 🚦 Getting Started

### Prerequisites

- [Nix](https://nixos.org/) (highly recommended) or:
- [Deno](https://deno.com/), [Rust](https://www.rust-lang.org/),
  [Go](https://go.dev/), [Just](https://github.com/casey/just),
  [Buf](https://buf.build/)

### Development

```bash
# Generate code from proto
just server proto

# Start all services
just dev

# Run server quality gate (fmt + lint + typecheck + proto)
just server quality
```

## 📂 Project Structure

```text
template/
├── src/
│   ├── client/          # SvelteKit + Deno SDK
│   └── server/          # Rust engine + Go RPC
│       ├── proto/       # Shared Protobuf definitions
│       ├── engine/      # Rust Hexagonal Core + GraphQL Gateway
│       ├── rpc/         # Go gRPC services
│       └── db/          # Database tests & tools
├── scripts/             # CI/CD & Dev scripts
└── docker-compose.yml   # Infrastructure orchestration
```
