# 🐹 GWA Server · Microkernel

A domain-agnostic, high-performance server template using Rust for core logic and Go for sidecar services.

## 🚀 Quickstart (Microkernel Mode)

Requires **Nix** for the authoritative toolchain.

```bash
# 1. Enter the dev shell
nix develop

# 2. Build and start all services (DB + Engine + RPC)
just server run

# 3. Run the unified test suite
just server test
```

## 🏗️ Architecture

- **Microkernel-via-Nix**: `nix develop` provides the authoritative toolchain (Rust, Go, Deno, etc.).
- **Containers for State Only**: Only SurrealDB runs in a container. Engine and RPC run as native processes in the Nix shell for sub-second iteration.
- **Hexagonal Rust Engine**: Pure domain logic isolated from transport and storage.
- **Go Sidecar**: Specialized compute plane for tasks like notifications and document generation.

## 🚦 Recipes

- `just server run`: Start the full stack with a signal trap for clean shutdown.
- `just server test`: Run all Deno-based unit, integration, and E2E tests.
- `just server build`: Build all components (DB image, Rust binary, Go stubs).
- `just server down`: Forcefully tear down all services.
- `just server quality`: Run `fmt`, `lint`, and `typecheck` across the workspace.

## 📁 Structure

- `db/`: SurrealDB schema, functions, and seed data.
- `engine/`: Rust workspace (domain, store, application, gateway).
- `rpc/`: Go sidecar (notifier, documents).
- `proto/`: Protobuf definitions for service communication.
- `tests/`: Unified Deno test suite.
