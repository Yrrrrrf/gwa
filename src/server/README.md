# 🐹 GWA Server · Microkernel

A domain-agnostic, high-performance server template using Rust for core logic and Go for sidecar services.

## 🚀 Quickstart (Microkernel Mode)

Requires **Nix** for the authoritative toolchain.

```bash
# 1. Enter the dev shell
nix develop

# 2. Build and start all services (DB + Engine + RPC)
just run

# 3. Run the unified test suite
just test
```

## 🏗️ Architecture

- **Microkernel-via-Nix**: `nix develop` provides the authoritative toolchain (Rust, Go, Deno, etc.).
- **Containers for State Only**: Only SurrealDB runs in a container. Engine and RPC run as native processes in the Nix shell for sub-second iteration.
- **Hexagonal Rust Engine**: Pure domain logic isolated from transport and storage.
- **Go Sidecar**: Specialized compute plane for tasks like notifications and document generation.

## 🚦 Recipes (Modular Just)

This project uses modular justfiles. Each peer directory (`db/`, `engine/`, `rpc/`, `tests/`) owns its own recipes, which are composed at the root.

- `just run`: Start the full stack (DB + Engine + RPC).
- `just test`: Run all tests across all rings.
- `just test-db`: Run DB inner-ring (Hurl) and outer-ring (Deno) tests.
- `just test-engine`: Run Engine inner-ring (Cargo) and outer-ring (Deno) tests.
- `just test-rpc`: Run RPC inner-ring (Go) and outer-ring (Deno) tests.
- `just build`: Build all components.
- `just quality`: Run `fmt`, `lint`, and `typecheck` across the entire workspace.
- `just down`: Stop and remove DB containers.

## 🧪 The Three-Ring Test Model

We employ a three-ring testing strategy to ensure reliability while maintaining documentation value:

1. **Inner Ring** (Introspective): Per-directory tests (`db/tests/*.hurl`, `engine/**/src/*.rs`, `rpc/**/*_test.go`) that verify internal machinery.
2. **Outer Ring** (Extrospective): The `tests/` directory contains TypeScript-based tests that consume services through public contracts (GraphQL, RPC, SurrealQL). These serve as the primary usage documentation.
3. **E2E Sub-Ring**: High-level flows in `tests/e2e/` that prove cross-service integration.

## 📁 Structure

- `db/`: SurrealDB schema, functions, seed data, and inner-ring tests.
- `engine/`: Rust workspace (domain, store, application, gateway).
- `rpc/`: Go sidecar (notifier, documents).
- `proto/`: Protobuf definitions for service communication.
- `tests/`: Unified outer-ring test suite.
