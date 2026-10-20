# GWA server

Run `just run` **from this directory**. It starts SurrealDB and the Rust engine in
**two separate Podman pods**, waits for database/schema and engine readiness, then
streams labelled logs. Ctrl-C/SIGTERM stops both pods and preserves database and
artifact volumes. No client process is launched.

## Decisions and scope

This implementation follows the agreed server-only scope. Keep version `0.1.0`,
one root `justfile`, and the existing five `scripts/*.just` files. There are no
component Justfiles. `scripts/runtime.ts` is the small foreground process owner;
configuration, SQL, container definitions and recipes stay with their existing
owners. Rust application sources, canonical protobuf contracts, SurQL definitions,
migrations and seeds retain their behavior.

`compose.yaml` is the only container definition. Its `db` and `engine` service
profiles run as separate Compose projects (`<project>-db`, `<project>-engine`) and
pods (`<project>-db-pod`, `<project>-engine-pod`). Both use the same owned external
network (`<project>-network`). Separate invocations are necessary because Podman
Compose's pod setting applies to the entire selected Compose project. Pod names,
images, builds, mounts, published ports, health checks and restart policy are
projected into this one file, rather than copied into another stack definition.
Each pod deliberately uses `--infra=false --share=`; its one workload retains its
own network namespace and joins the shared Compose network.

The engine currently has no database client. Database initialization/readiness is
a stack startup requirement; `/ready` continues to describe the capability host.
Neither a DB SDK nor a client API layer is introduced here. Repository-root and
client orchestration are outside this server archive.

## Tools and first start

Use Linux or macOS with a working Podman runtime (start a Podman machine on macOS).
Install Deno 2.9.7, Just 1.57+, Nushell 0.116.0, Rust compatible with the manifest's
`rust-version`, Podman, podman-compose 1.6.0, Hurl/hurlfmt 8.0.1, and cargo-audit.
`config/toolchains.toml` records the tested runtime and container tool versions;
Cargo's manifest remains authoritative for Rust. No server Nix flake was included
in the supplied source; this archive does not claim one exists.

```console
just prepare
just run
```

`prepare` installs the frozen consumer dependencies and validates both Compose
profiles without starting workloads. `run` can also start directly on a prepared
host: it projects configuration, builds the two source-tagged images, starts DB,
initializes an empty DB or validates/applies pending migrations, then starts the
engine. The database image builds before the engine because the latter reuses its
Nushell binary. Both workloads remain running concurrently after startup.

Published addresses default to loopback: DB `127.0.0.1:8000`, HTTP `127.0.0.1:8080`,
gRPC `127.0.0.1:50051`. Actual endpoints are printed after readiness. Host overrides
are `GWA_DB_PORT`, `GWA_HTTP_PORT`, `GWA_GRPC_PORT`, and `GWA_HOST`; ports must be
distinct and the host must remain loopback. Within the shared network the database
service's DNS alias is `db`; the engine does not currently consume it.

## Commands

| Command | Behavior |
| --- | --- |
| `just`, `just list`, `just menu` | Discover the commands from this root |
| `just run` | Foreground DB + engine session; no client and no CI run |
| `just stop` | Request coordinated foreground shutdown, or stop a detached server stack; retain volumes |
| `just reset` | Explicitly stop and delete development DB/artifact volumes; run again to initialize |
| `just logs [all\|db\|engine]` | Follow existing container logs without changing configuration |
| `just status` | Inspect both Compose projects and their pods without regenerating configuration |
| `just prepare` | Install locked consumers, project configuration and validate Compose |
| `just test [category]` | Build once, use an isolated project/ports/volumes, run consumers and tear down owned test storage |
| `just test scripts/dev` | Offline process, configuration, ownership and readiness tests |
| `just test db/migrations` | Migration retention, history, rollback and locking against a disposable DB |
| `just test-unit` | Locked Rust unit tests |
| `just fmt`, `just fmt-check` | Format, or verify Rust/Deno/Hurl source |
| `just lint`, `just types`, `just contracts`, `just audit` | Individual quality gates |
| `just check` | Formatting, lint, types, offline contracts/lifecycle tests and dependency audits |
| `just ci` | Rust unit tests, disposable container consumers, then checks, in the existing order |
| `just build` | The same full gate; keep the exact images built and tested by the consumer phase, without a second image-build invocation |
| `just db-init [dev\|prod]` | Start DB and initialize an empty database; requires the images built by `run`/`build` |
| `just db-migrate [dev\|prod]` | Start DB, validate history and upgrade retained data; no seeds |
| `just deploy [configured\|initialize\|upgrade\|reset]` | Validate/build, then apply the explicit production storage policy |
| `just clean` | Remove Rust build outputs; retain locks, dependencies and data |

Unknown or empty test selections fail before containers start. Script/contract
categories run offline. Integration consumers exclude those already-owned offline
categories. Disposable test teardown validates ownership before deletion, attempts
both unit shutdowns, preserves the original failure, and retains the runtime
snapshot if cleanup fails so recovery remains possible.

## Configuration and retained state

`config/server.toml`, `database.toml`, `services.toml`, `toolchains.toml` and the
selected dev/prod profile own configuration. The public startup boundary generates
one snapshot. Runtime helpers read it; `logs` and `status` do not rewrite it.
Atomic replacement avoids partially written files. Concurrent foreground sessions
for the same project are refused, and an active session prevents unrelated
configuration regeneration.

The private `.state/<project>.json` is mode `600` inside a mode `700` directory.
The bind-mounted runtime TOML contains only the engine's runtime fields, omits
profile development credentials, and is mode `644` so container UID `65532` can
read the mounted file. Actual API/DB credentials remain in the private snapshot
and container environment, not in the mounted TOML. Provider configuration is
runtime configuration; do not embed credentials in provider URLs.

Both supplied profiles now declare `data_policy = "upgrade"`. An ordinary dev run
initializes only an empty database and otherwise applies append-only migrations.
Reset is explicit. Production defaults to its configured upgrade policy; use
`deploy initialize` for first initialization. Production reset still requires the
exact typed confirmation and explicit private reset guard.

Baseline assembly, checksums, exact-prefix history, transactional migration
markers and database-backed locking are preserved. Initialization seeds only the
selected dev/test fixture. Repeated starts/migrations do not reseed. An interrupted
initialization or stale migration lock requires inspection; it never triggers an
automatic destructive reset. Changing root credentials in environment variables
does not rotate an existing SurrealDB root account.

Predictable pod, container, network and volume names are checked for ownership.
An existing same-name resource belonging to another project is refused. Existing
containers are not taken over by a foreground session: stop their owning stack
before starting this version. Image tags include a fingerprint of the build
inputs, so concurrent test/dev projects do not silently replace differently built
images sharing only the package version.

## Session failures and recovery

Startup commands run in isolated process groups. SIGINT/SIGTERM reaches their
Just/Nushell/build descendants; a bounded cancellation deadline terminates any
remaining startup group before container teardown. Once ready, both workloads are
monitored for exit/unhealthy state. Failure stops the peer and returns nonzero.
Logs stream immediately with unit prefixes and bounded partial-line buffers.

`just stop` communicates with the foreground owner through its project session
marker and waits for teardown. Without a foreground owner it stops the two
Compose projects directly. A failure during cleanup is reported as a failure.

After an uncatchable SIGKILL or host crash, inspect the server processes/pods first.
Use `just stop` to stop remaining pods. If the old foreground process is proved
gone and its `.state/<project>.session` directory remains, remove that stale
session directory before starting again. Never remove a live session's lock.
Retained volumes are separate from this session marker.

## Capabilities and extension points

All four adapters share one registry/context. HTTP exposes authenticated `/api`
and `/api/{service}/{operation}`, JSON-RPC uses `/rpc`, WebSocket uses `/ws` with
the existing first-frame authentication, and gRPC uses the canonical generic
`gwa.system.Capabilities/Invoke` envelope. Public `/health` and `/ready` remain
payload-free probes; artifacts require authentication.

`notify.send`, `report.generate`, `system.enqueue` and `system.job` retain their
existing contracts. File notifications are real spool files, not an email-delivery
claim. Reports support text and HTML. Worker jobs remain bounded and volatile.
Add capabilities through their canonical contract, owning service and the single
registration point in `engine/src/service/mod.rs`; no adapter-specific copy is
needed.

See `VALIDATIONS.md` for the checks executed for this archive and the container
checks that remain required on a capable host.
