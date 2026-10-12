# GWA validation record and release checklist

Validated on 2026-10-05, Linux x86_64. The deliverable implements the agreed template with only dev/prod, two Dockerfiles, five Just files, `run`/`stop`, and mirrored tests. Source/contract ownership checks passed. **Full container CI and production deployment are not marked passed.**

## Executed evidence

| Check | Result | Evidence / scope |
| --- | --- | --- |
| Rust compilation and generated bindings | PASS | Rust 1.98.1, locked build/check; Rust 1.99.0 also used during reconstruction |
| Rust unit behavior | PASS | 7 tests: duplicate registration/unknown operation, config limits and disabled capabilities, production token/provider constraints, HTML escaping, webhook failure without fallback, queue saturation/draining/failure visibility, JSON-RPC null-ID handling |
| Native Hurl sessions | PASS | 8 files, 23 HTTP requests, 0 failed; real SurrealDB 3.3.0 and Rust host |
| Native Deno consumers | PASS | 12 unique tests: 10 engine tests plus config and migration lifecycle; 0 failed/skipped |
| HTTP adapter | PASS | Registry listing, real capability dispatch, malformed/missing/extra fields, unknown capability, 401, 405, 413, attachment authorization/MIME/bytes/name validation/nosniff |
| JSON-RPC adapter | PASS | Explicit null and string IDs, notification 204, mixed batches, empty batch, parse error, unknown method, invalid parameters |
| gRPC adapter | PASS | Canonical generated envelope/reflected descriptor, both capabilities; unauthenticated 16, unknown 5, invalid 3 |
| WebSocket adapter | PASS | First-frame auth/ack, both capabilities, ID preservation, unknown method, malformed JSON, wrong-auth close 1008, binary close 1003 |
| Notification behavior | PASS | Unique file-provider receipts, invalid inputs rejected; actual HTTP-500 webhook unit test reports error with no file fallback |
| File generation | PASS | Text/HTML contents, escaping, actual byte counts/MIME, authenticated downloads, unsupported PDF rejected |
| Worker behavior | PASS | Observable success/failure; bounded admission rejects overflow; cancellation rejects new work and drains admitted work in unit test |
| Database baseline | PASS | Schemafull fields, nonempty title, email uniqueness/validity, typed owner, read-only creation timestamp, enforced relation endpoints, event link and unique edge, referenced-owner deletion rejected |
| Record permissions/access | PASS | Signup, signin, two-account isolation, unauthorized update yields no records, password hidden, relation visibility and permission-filtered function count |
| Migration lifecycle | PASS | Baseline-only init, pending verification, upgrade, repeated upgrade, retained record, init-on-existing refusal, competing lock preserved, transaction rollback/no marker/no leaked lock, applied checksum drift rejected |
| Seeds | PASS | Disposable fixture present; development fixture absent in the tested DB; seed selection during initialization exercised |
| Configuration projection/guards | PASS | Only dev/prod, project/profile restrictions, canonical dev credentials refused for production, explicit production credentials accepted, private prod reset refused without explicit guard |
| Graceful host shutdown | PASS | Real engine received SIGTERM and exited 0 after native suite; directly owned server/worker futures and tracked WebSocket sessions reviewed |
| Formatting | PASS | `just fmt-check`: Rust, 17 Deno config/source files, Hurl parser/formatter checks |
| Lint | PASS | `just lint`: Clippy all targets with `-D warnings`, Deno lint |
| Types | PASS | `just types`: locked Cargo all-targets check, frozen Deno check of every test including the unexecuted container test |
| Contracts/architecture | PASS | `just contracts`: 2 offline tests; canonical reflected messages and expected layout/dependency order |
| Cargo audit | PASS | 235 locked crate packages checked against 1290 loaded RustSec advisories; no known vulnerabilities reported |
| Deno/npm audit | PASS | 34 locked npm package records; no known vulnerabilities reported. The environment's proxy caused a trust failure in direct audit, so the same audit used a temporary local relay forwarding to the official npm advisory API with the supplied CA. No registry errors were ignored; no dependency auto-fix was used. Relay is excluded from source. |
| Compose configuration | PASS | Actual `podman-compose 1.6.0 config` rendered both units, projected environment, external volumes and escaped Nushell health expressions |
| Nix evaluation | PASS | `nix flake check --no-build` evaluated Linux x86_64 outputs; lock generated and package versions inspected |
| Minimum Rust/tool compatibility | PASS | Rust 1.98.1 matches locked Nix package metadata; full native suite passed through Nushell 0.115.1 and Deno 2.8.0; image tool declarations pin Nu 0.116.0 and SurrealDB 3.3.0 |
| ZIP/source integrity | PASS | 95 files, zero duplicate full-file contents, archive CRC, unique member paths, expected root/layout, source extraction, relative contract paths and offline contracts checked; build output, state, installed dependencies, git metadata and secrets excluded |

The 2 offline contract checks are included in the 12 unique Deno tests; rerunning them through `just contracts` is not counted as additional coverage. Native processes exercised real functionality and the shared consumer recipes. This does not replace container lifecycle checks.

## Duplication and ownership

| Authority | Validation |
| --- | --- |
| Capability message shapes | Only protobuf files under `config/contracts`; generated Rust stays under target; tests use protobuf reflection, not copied DTO declarations |
| Database application schema and rules | Only SurQL under `db`; engine has no SurrealDB/SQLx dependency or copied record models |
| Baseline | Definitions assembled once and checksum-recorded; no copied baseline migration |
| Capability registration | One `service/mod.rs` entry point; duplicate/reserved registrations rejected; four adapters reuse one registry/context |
| Shared defaults | Shared TOML declarations; dev credentials only in dev profile; host ports derive from binds; generated projections are excluded from deliverables |
| Containers | Exactly `db/db.Dockerfile` and `engine/engine.Dockerfile`; engine reuses the database image's Nushell binary |
| Recipes | Exactly `_shared`, `dev`, `test`, `check`, `deploy`; shared executor/config/SQL/container/volume/readiness/migration logic; CI is tests-before-checks and has no build/test recursion |
| Tests | Directories mirror ownership, including `engine/service/files` and `notify`; shared test clients/fixtures; no delivery of runtime test copies |
| Source clones | Automated normalized-content comparison of substantive Rust/protobuf/SurQL/Just source files found no identical authored implementations |
| Protobuf dependency | Deno lock contains one protobufjs version, 7.6.6, shared with gRPC loader |

“No duplicate implementation/models/contracts” is the checked scope. Upstream Rust dependencies still require parallel versions of base64, cpufeatures, getrandom, hashbrown, r-efi, rand, rand_core, syn, windows-sys and winnow. Their locked versions were audited; the archive does not claim that the entire external dependency graph has one version per crate. Small module declarations, protocol assertions and independent Hurl request headers necessarily repeat syntax.

## Checks still required on a capable host

| Check | Current status | Acceptance / command |
| --- | --- | --- |
| Two container image builds | BLOCKED HERE | `just run` or `just _images dev`; verify both images build with manifest/toolchain args, nonroot users, reused Nu and locked Cargo dependencies |
| Full container suite | BLOCKED HERE | `just test`; 12 native checks must also pass inside the composed runtime; execute the additional `tests/scripts/dev/lifecycle_test.ts` |
| Stop/retention/reset | UNVERIFIED IN CONTAINERS | `just test scripts/dev`; stop/recreate retains the record, explicit reset removes it, teardown removes only owned test volumes |
| Development run/stop/logs/status | UNVERIFIED IN CONTAINERS | Start with active unrelated containers, ensure dev reset scope, readiness, announced endpoints, Ctrl-C log behavior, retained stop and useful status |
| Test isolation alongside active dev | UNVERIFIED IN CONTAINERS | Tests select distinct available host ports/project/volumes; run concurrent/unrelated workloads and confirm no collision or deletion |
| Volume ownership refusal | CODE REVIEW / PENDING RUNTIME | Create an unowned same-name volume and verify reuse/reset fail without deleting it; also verify both owner labels and volume permissions |
| Container health and signals | PENDING | Check actual healthy transitions, HTTP/DB internal port projection, WS closure, SIGTERM, stop grace and restart after failures |
| `just ci`, `just build`, `just check` as complete gates | NOT CLAIMED | Run with functional Podman and normal trusted registry access. Individual formatting/lint/types/contracts and audits passed; full gates were not substituted with success stubs |
| Nix package build/shell activation | BLOCKED HERE | `nix build`, `nix develop` on a standard installed Nix host. The relocated scratch store could not execute an absolute `/nix/store/.../bash` dependency; engine derivation did not compile there |
| Other declared platforms | NOT RUN | ARM Linux and both Darwin targets: shell/package build, generated contract tooling, Podman machine, CPU-specific Nu and image compatibility |
| Production initialize/upgrade/reset | NOT EXECUTED | Against disposable production-named storage: no seeds; initialize refusal; upgrade retains data; default reset names both volumes, creates no backup, requires exact typed confirmation; incorrect confirmation deletes nothing |
| Startup/component failure propagation | PARTIAL | Readiness withheld until both binds; test busy port, invalid runtime config, missing token and component failure; host exits nonzero and cancels remaining components |
| Saturated/slow shutdown | PARTIAL | Load full queue/active WS and slow provider; admit no work after cancel, drain within deadline; force deadline and confirm nonzero exit/no retained task handles |
| Protocol limits and timeout edges | PARTIAL | Oversized gRPC/WS, malformed envelopes/IDs, authenticated idle WS timeout, operation deadline and provider timeout, maximum batch; HTTP 413 already passed |
| Artifact filesystem failures | PENDING | Unwritable/missing/full volume, disk errors, partial writes and missing IDs must return real failures; validate download access and retention policy under load |
| Webhook deployment behavior | PARTIAL | Unit HTTP-500 failure passed. Validate real endpoint success, timeout, redirect refusal, TLS, downstream handling of idempotency key and secrets; no fallback or email-delivery claim |
| Remote security and credentials | DEPLOYMENT-SPECIFIC | Loopback publication, external TLS edge, strong unique credentials, disabled guest DB access, access permissions, secret log/inspection exposure, root-account rotation with retained storage |
| Backup/restore and lock recovery | DEPLOYMENT-SPECIFIC | Backup and restore into separate storage; verify exact migration prefix/checksums; crash a migration runner and explicitly recover only its stale lock after proving it is stopped |
| Production capacity/durability | DEPLOYMENT-SPECIFIC | Measure throughput/latency/queue saturation, memory/disk and shutdown budget; accept volatile jobs/file spool limitations or deliberately extend capabilities with canonical contracts |
| Supply-chain release review | PENDING | Fresh advisories, OCI tag/digest/platform review, JSR DV publisher/source review, provenance, deployment registry access and image scans |

Podman probe failed with `cannot write setgroups file ... /proc/.../setgroups`. This environment cannot create the necessary container namespace. The blocked image/lifecycle/deployment checks above were not silently skipped or reported as passes.

## Release sequence

1. `nix develop` (or install the documented compatible tools).
2. `deno install --config tests/deno.json --frozen`.
3. `just ci` — real unit tests, disposable container consumers, then checks.
4. `just build` — same gate followed by both images, without recursion.
5. Complete the relevant deployment-specific checks above against disposable retained storage.
6. Configure explicit production credentials; use `just deploy initialize` or `just deploy upgrade` for retention. `just deploy` defaults to the separately confirmed destructive reset.

No deployment was performed, and no production storage was modified during validation.
