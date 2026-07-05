# GWA Project `just` Commands Reference

This document provides a comprehensive overview of all the `just` commands (recipes) available in the GWA template workspace.

All recipes in this workspace are configured to execute using **Nushell** (`set shell := ["nu", "-c"]`).

---

## 🛠️ Root Commands

These commands are run directly from the project root (e.g., `just <command>`). They orchestrate the workspace across all namespaces.

| Command | Group | Description | Definition File |
| :--- | :--- | :--- | :--- |
| `just list` | `meta` | Show the help menu with all recipes. | [scripts/_shared.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/scripts/_shared.just) |
| `just run` | `dev` | Run the development environment (delegates to `client::run`). | [scripts/dev.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/scripts/dev.just) |
| `just build` | `dev` | Build all namespaces (`client`, `server`, and `cli`). | [scripts/dev.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/scripts/dev.just) |
| `just fmt` | `check` | Format all code namespaces. | [scripts/check.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/scripts/check.just) |
| `just lint` | `check` | Lint all code namespaces. | [scripts/check.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/scripts/check.just) |
| `just types` | `check` | Type-check all code namespaces. | [scripts/check.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/scripts/check.just) |
| `just check` | `check` | Run all quality gates (`fmt` + `lint` + `types`). | [scripts/check.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/scripts/check.just) |
| `just test` | `test` | Run all test suites. | [scripts/test.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/scripts/test.just) |
| `just ci` | `ci` | Run full CI pipeline (`check` + `test`). | [scripts/ci.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/scripts/ci.just) |
| `just commit <msg>` | `ci` | Commit code with safety checks, ensuring no broken tree is committed. | [scripts/ci.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/scripts/ci.just) |
| `just deploy` | `deploy` | Deploy the entire application stack. *(Note: currently blocked)* | [scripts/deploy.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/scripts/deploy.just) |

---

## 💻 Client Namespace (`just client <command>`)

Defined in [src/client/client.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/client/client.just). These target the client frontend application and Svelte UI sdk.

| Command | Group | Description | Definition File |
| :--- | :--- | :--- | :--- |
| `just client list` | `meta` | Show client help menu. | [scripts/_shared.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/client/scripts/_shared.just) |
| `just client sync-ui` | `dev` | Sync SvelteKit UI and compile Paraglide translation files. | [scripts/dev.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/client/scripts/dev.just) |
| `just client build [app]` | `dev` | Build all apps or a specific one (e.g., `just client build vision`). | [scripts/dev.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/client/scripts/dev.just) |
| `just client run [app]` | `dev` | Run an app in development mode (e.g. `just client run vision`). | [scripts/dev.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/client/scripts/dev.just) |
| `just client preview [app]` | `dev` | Preview a built app. | [scripts/dev.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/client/scripts/dev.just) |
| `just client pwa-check` | `dev` | Verify PWA installability flags. | [scripts/dev.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/client/scripts/dev.just) |
| `just client fmt` | `check` | Format client code (`deno fmt`). | [scripts/check.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/client/scripts/check.just) |
| `just client lint` | `check` | Lint client code (`deno lint`). | [scripts/check.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/client/scripts/check.just) |
| `just client types` | `check` | Type-check client code (`svelte-check`). | [scripts/check.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/client/scripts/check.just) |
| `just client check` | `check` | Run all client quality gates. | [scripts/check.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/client/scripts/check.just) |
| `just client test` | `test` | Run client test suite (`deno test`). | [scripts/test.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/client/scripts/test.just) |
| `just client ci` | `ci` | Run client CI pipeline. | [scripts/ci.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/client/scripts/ci.just) |
| `just client deploy` | `deploy` | Deploy client application. *(Note: currently blocked)* | [scripts/deploy.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/client/scripts/deploy.just) |

---

## 🖥️ Server Namespace (`just server <command>`)

Defined in [src/server/server.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/server/server.just). These coordinate backend database, engine, RPC, and test services.

| Command | Group | Description | Definition File |
| :--- | :--- | :--- | :--- |
| `just server list` | `meta` | Show server help menu. | [scripts/_shared.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/server/scripts/_shared.just) |
| `just server build` | `dev` | Build all server components (`db` + `engine` + `rpc`). | [scripts/dev.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/server/scripts/dev.just) |
| `just server run` | `dev` | Run all server components in development mode. | [scripts/dev.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/server/scripts/dev.just) |
| `just server fmt` | `check` | Format all server components. | [scripts/check.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/server/scripts/check.just) |
| `just server lint` | `check` | Lint all server components. | [scripts/check.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/server/scripts/check.just) |
| `just server types` | `check` | Type-check all server components. | [scripts/check.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/server/scripts/check.just) |
| `just server check` | `check` | Run all server quality gates. | [scripts/check.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/server/scripts/check.just) |
| `just server test` | `test` | Run all server tests (unit + integration + smoke). | [scripts/test.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/server/scripts/test.just) |
| `just server ci` | `ci` | Run server CI pipeline. | [scripts/ci.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/server/scripts/ci.just) |
| `just server deploy` | `deploy` | Deploy server stack. *(Note: currently blocked)* | [scripts/deploy.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/server/scripts/deploy.just) |

### 🗄️ Server Database Submodule (`just server::db <command>`)
Located in [src/server/db/db.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/server/db/db.just).

* `just server::db build`: Build the SurrealDB image using Podman.
* `just server::db run`: Run SurrealDB container.
* `just server::db down`: Stop SurrealDB container.
* `just server::db test`: Run SurrealDB API & query tests using Hurl.
* `just server::db test-one <FILE>`: Run a specific Hurl test file for debugging.
* `just server::db test-report`: Run Hurl tests and generate an HTML report.
* `just server::db check`: Run formatting/linting/typing checks (vacuous placeholders).

### ⚙️ Server Engine Submodule (`just server::engine <command>`)
Located in [src/server/engine/engine.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/server/engine/engine.just).

* `just server::engine build`: Build the gateway engine Rust project.
* `just server::engine run`: Run the Rust gateway engine with `RUST_LOG=debug`.
* `just server::engine test`: Run cargo unit tests across the workspace.
* `just server::engine fmt` / `lint` / `types` / `check`: Rust formatting, clippy, and cargo compiler checks.

### 🌐 Server RPC Submodule (`just server::rpc <command>`)
Located in [src/server/rpc/rpc.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/server/rpc/rpc.just).

* `just server::rpc generate`: Generate Go & TypeScript connect stubs from Protobuf definitions.
* `just server::rpc build`: Build the Go RPC sidecar binary.
* `just server::rpc run`: Run the Go RPC sidecar directly.
* `just server::rpc test`: Run unit tests for Go RPC sidecar (filtering code-generated files).
* `just server::rpc test-smoke`: Run live smoke tests against the RPC sidecar using grpcurl.
* `just server::rpc test-all`: Run both unit and smoke tests.
* `just server::rpc fmt` / `lint` / `types` / `check`: Go syntax formatting, vet, compile, and verification checks.

### 🧪 Server Tests Submodule (`just server::tests <command>`)
Located in [src/server/tests/tests.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/server/tests/tests.just).

* `just server::tests test`: Run integration tests using Deno and `vite-plus`.
* `just server::tests fmt` / `lint` / `types` / `check`: Deno linting and formatting quality checks.

---

## 📟 CLI Namespace (`just cli <command>`)

Defined in [src/cli/cli.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/cli/cli.just). These manage the terminal CLI tool (currently implemented as placeholders).

| Command | Group | Description | Definition File |
| :--- | :--- | :--- | :--- |
| `just cli list` | `meta` | Show CLI help menu. | [scripts/_shared.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/cli/scripts/_shared.just) |
| `just cli build` | `dev` | Build CLI application. | [scripts/dev.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/cli/scripts/dev.just) |
| `just cli run` | `dev` | Run CLI application. | [scripts/dev.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/cli/scripts/dev.just) |
| `just cli fmt` | `check` | Format CLI code. | [scripts/check.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/cli/scripts/check.just) |
| `just cli lint` | `check` | Lint CLI code. | [scripts/check.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/cli/scripts/check.just) |
| `just cli types` | `check` | Type-check CLI code. | [scripts/check.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/cli/scripts/check.just) |
| `just cli check` | `check` | Run all CLI quality gates. | [scripts/check.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/cli/scripts/check.just) |
| `just cli test` | `test` | Run CLI test suite. | [scripts/test.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/cli/scripts/test.just) |
| `just cli ci` | `ci` | Run CLI CI pipeline. | [scripts/ci.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/cli/scripts/ci.just) |
| `just cli deploy` | `deploy` | Deploy CLI application. | [scripts/deploy.just](file:///home/yrrrrrf/Documents/lab/tek/packages/gwa/template/src/cli/scripts/deploy.just) |
