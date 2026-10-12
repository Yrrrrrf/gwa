# GWA server

Two runtime units: SurrealDB owns application data and the Rust engine hosts capabilities. The engine has HTTP, JSON-RPC, gRPC and WebSocket adapters, a bounded worker, shared infrastructure, and file/notification implementations. It has no database SDK or duplicated database models.

## Structure

| Path | Owns |
| --- | --- |
| `config/*.toml` | Shared server, database, provider and tool declarations |
| `config/profiles/dev.toml`, `prod.toml` | The only profiles; profile-specific policy and development credentials |
| `config/contracts/{notify,report,system}/*.proto` | Canonical capability messages and the generic gRPC envelope |
| `db/db.Dockerfile` | Database container and the reusable Nushell executable |
| `db/definitions/{tables,fields,indexes,functions,events,access}` | Immutable baseline schema, access rules and database behavior |
| `db/migrations` | Append-only upgrades after the baseline |
| `db/seeds` | Development and disposable consumer fixtures |
| `db/operations` | Bootstrap, lock, ledger, transaction and inspection statements |
| `engine/engine.Dockerfile`, `Cargo.toml`, `build.rs` | Engine build and generated contract bindings |
| `engine/src/api` | HTTP, JSON-RPC, gRPC and WebSocket boundaries |
| `engine/src/worker` | Admission, execution, bounded job retention and draining |
| `engine/src/shared` | Configuration, context, faults, readiness, shutdown and telemetry |
| `engine/src/service/notify` | Notification validation and real file/webhook providers |
| `engine/src/service/files` | File generation and text/HTML rendering for `report.generate` |
| `engine/src/service/{operation,registry,mod}.rs` | Operation abstraction, duplicate-safe registry and one registration point |
| `tests/db`, `tests/engine`, `tests/scripts` | Tests mirroring the owner and subdirectories of the tested behavior |
| `scripts/{_shared,dev,test,check,deploy}.just` | Exactly five recipe files, with inline Nushell logic |

There is no standalone `services` library, third orchestration unit, test profile, preview command, or delivered shell/Python script. Generated bindings, runtime config, dependencies and build artifacts are excluded from the ZIP.

## Start

On a Linux host with functional Podman, enter the pinned development shell and install locked consumer dependencies:

```console
nix develop
deno install --config tests/deno.json --frozen
just run
```

For macOS, initialize/start a Podman machine first. The four Nix platforms are declared; validation performed here covered Linux x86_64 only. Alternatively install Rust compatible with `engine/Cargo.toml`, Just >=1.57, Nushell >=0.115.1, Deno >=2.8, Hurl 8.0.1, cargo-audit, Podman and podman-compose.

`run` rebuilds the database image first, reuses its Nushell executable in the engine image, resets **development database and artifact volumes**, initializes the database, starts the engine, checks readiness and follows logs. Ctrl-C ends log following. `just stop` stops containers and retains volumes. `run` resets them again when invoked; use `db-migrate` and `_up` for intentional retention workflows.

Published addresses are loopback. Endpoint ports derive from shared bind declarations; optional `GWA_DB_PORT`, `GWA_HTTP_PORT` and `GWA_GRPC_PORT` override host ports. Development credential values live only in `config/profiles/dev.toml`. Runtime projections under `.state` are private and excluded from version control and deliverables. Keep them private; container inspection also exposes configured credentials.

## Recipes

| Command | Behavior |
| --- | --- |
| `just list`, `just menu` | DV command discovery and selection |
| `just run`, `just stop` | Disposable development start; retained-storage stop |
| `just logs [all\|db\|engine]`, `just status` | Runtime logs and container status |
| `just test [category]` | Independent project/volumes and available host ports using dev configuration, test seeds and guaranteed teardown after the test phase |
| `just test engine/api/grpc`, `just test db`, `just test scripts/deploy` | Select the literal mirrored directory |
| `just test-unit` | Locked Rust unit tests |
| `just fmt`, `just fmt-check` | Format, or verify Rust/Deno/Hurl formatting |
| `just lint`, `just types`, `just contracts`, `just audit` | Individual validation gates |
| `just check` | Formatting, lint, types, contracts/architecture, dependency audits; no autofixes |
| `just ci` | Unit tests, consumer tests, then checks, in order |
| `just build` | CI, then both images; no recursive build/test dependency |
| `just db-init [dev\|prod]` | Initialize an empty database and reject existing business data |
| `just db-migrate [dev\|prod]` | Validate history and apply pending upgrades without deleting retained data |
| `just deploy [reset\|initialize\|upgrade]` | Build with CI and deploy production using the explicit storage policy |
| `just clean` | Remove Rust build outputs; retain locks and storage |

The generic DV executor receives argv directly. Configuration, container execution, volume checks, readiness, SQL rendering and migration handling have shared private recipes. Scripts need no separate lifecycle framework.

## Capabilities and adapters

All adapters invoke the same context/registry. The canonical protobuf contracts generate Rust messages at build time. Consumer tests load those same protobuf files through reflection; there are no handwritten copies of capability DTOs.

| Capability | Behavior |
| --- | --- |
| `notify.send` | Validates recipient/subject/body; returns a provider and unique receipt only after the chosen provider succeeds |
| `report.generate` | Generates actual text or escaped HTML; returns artifact ID, MIME and byte count |
| `system.enqueue` | Admits a registered capability to the bounded worker; accepts JSON in the canonical envelope |
| `system.job` | Returns observable queued/running/succeeded/failed state and result/error |

HTTP: authenticated `GET /api`, `POST /api/{service}/{operation}`. JSON-RPC: authenticated `POST /rpc`, with notifications, batches and preserved IDs, including explicit null. WebSocket: `/ws`; the first text frame is `{"auth":"<token>"}`, followed by the same JSON-RPC messages. Tokens are not URL parameters. gRPC: `gwa.system.Capabilities/Invoke`, with `authorization: Bearer <token>` metadata and the generated envelope. `/health` and `/ready` are public, payload-free probes. `/artifacts/{id}` requires authentication and returns attachment/nosniff headers.

Example HTTP payloads conform to `config/contracts`:

```json
{"recipient":"person@example.test","subject":"Hello","body":"Message"}
```

```json
{"title":"Example","content":"Report body","format":"html"}
```

The default notification provider writes a real spool file under `notifications`; it does not claim email delivery. The optional webhook provider performs a timed POST with an idempotency key and refuses redirects; failures propagate without file fallback. Text and HTML are supported; PDF is not implemented. The artifact endpoint serves generated reports, not notification contents.

To add a capability, add its canonical contract, implement `Operation` under its owning service directory, and register it **once** in `engine/src/service/mod.rs`. Add mirrored consumer tests. Adapters require no capability-specific implementations.

## Database and deployment

The baseline is assembled in the order declared by `config/database.toml`, and recorded as `0001-baseline`. It is not copied into an initial migration. All SQL definitions and runtime database rules remain in `db`.

Initialization and upgrades acquire one database-backed lock. Every migration and its checksum marker run in one transaction. Applied history must be an exact prefix of local history; drift, downgrade, ahead-of-code history, pending verification and competing locks fail. Initialization rejects existing domain tables or history. Upgrades retain records and run no seeds. Production initialization also runs no seeds. Development and test seeds are selected explicitly on initialization.

Do not edit applied definitions or migrations. Add the next migration. The baseline is immutable after use. A failed initialization seed can leave an initialized ledger; investigate the seed failure and explicitly reset only disposable data or repair deliberately. A process crash can leave a lock: inspect its owner, establish that its runner is gone, then release that exact owner through the canonical unlock operation. Locks do not expire silently.

Set explicit production credentials of at least 24 characters through the environment or an untracked `.env` (see `config/env.example`). Existing root credentials in retained SurrealDB storage must still match; changing an environment value does not rotate an existing root account.

`just deploy` defaults to `reset`, prints the two production volume names and that no backup is created, and requires typing `gwa-prod` before deletion. `deploy initialize` refuses existing domain data; `deploy upgrade` preserves volumes and applies pending migrations. Volume labels must match the project before reuse or removal. Container shutdown is separate from volume deletion.

## Runtime limits and validation

The worker is deliberately volatile: bounded queue and bounded completed-job retention, no persistence/retry guarantee, and completed jobs can be evicted. Restart loses job status. Deadlines cancel futures; external side effects already completed are not rolled back, and retries are not promised to be idempotent. Each queued task has a timeout. Shutdown stops admission and drains admitted work within the configured host deadline; forced cancellation reports failure. WebSocket sessions are tracked through shutdown.

Use a separately managed TLS/authentication edge for remote access. Production file-provider choice, credential rotation, backup/restore, realistic load, failure recovery, and any webhook's downstream behavior require deployment-specific validation.

See **VALIDATIONS.md** for executed evidence, the complete release checklist, and checks this environment could not complete. This archive is an implemented and tested template; full container CI is not marked passed.
