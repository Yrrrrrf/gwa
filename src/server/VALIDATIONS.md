# Validation record — server lifecycle integration

This record describes the server-only archive produced from the supplied source
export. Earlier validation claims from that export are not carried forward as
proof for this implementation. Version remains `0.1.0`.

## Executed checks

| Check | Result | Evidence and scope |
| --- | --- | --- |
| Exact `just check` | PASS | Formatting, Clippy with warnings denied, Deno lint, locked Rust/all-targets types, frozen Deno types, offline contracts/lifecycle tests and both dependency audits completed successfully after the final source edits |
| Rust unit tests | PASS | 7 tests through the existing locked Cargo/DV recipe; renderer, registry, config, worker draining, JSON-RPC IDs and provider failures |
| Offline contracts/lifecycle | PASS | 13 tests: canonical protobuf reflection; config projection/guards; real Just/Nushell ownership and error handling with a fake Podman boundary; readiness HTTP/health/deadlines; foreground streaming, retention, signal cleanup, nested startup cancellation, public stop and failure propagation |
| Real native DB + engine consumers | PASS | SurrealDB 3.3.0 and the compiled Rust engine ran as native host processes on distinct temporary ports; the existing `_consumer` recipe passed 8 Hurl files / 23 requests and 9 Deno consumer cases |
| Migration lifecycle | PASS | The consumer case exercised baseline-only initialization, automatic upgrade/ensure, repeated ensure, retained records, init refusal, competing-lock preservation, applied-baseline drift rejection, transaction rollback/no marker/no leaked lock, and final verification in a disposable DB |
| Native graceful shutdown | PASS | Both native processes received SIGTERM and exited 0 after the final consumer run |
| Compose parsing | PASS | Actual podman-compose 1.6.0 parsed the canonical file separately for `db` and `engine`; each selected exactly one service |
| Compose pod command generation | PASS, dry run only | Actual podman-compose 1.6.0 generated distinct `<project>-db-pod` and `<project>-engine-pod` creations, joined each workload to its own pod, and attached both to the same external network; Podman inventory responses were faked for this dry run, not workload success |
| Rust dependency audit | PASS | cargo-audit 0.22.2 scanned 235 locked crate dependencies against 1329 fetched advisories, without ignored failures or vulnerability suppressions |
| Deno dependency audit | PASS | Frozen Deno/npm audit reported no known vulnerabilities |
| Source/scope review | PASS | Rust application sources and all authored SurQL files remain byte-identical to the supplied export; one server root `justfile`, exactly the original five `.just` recipe files; no client or repository-root changes |

The native and process-boundary tests are real tests of their stated boundaries.
They do not establish that images build or that pods run correctly on a host.
The 13 offline and 9 native consumer cases are 22 unique Deno test cases. There
are 7 Rust unit tests. Repeated runs are not counted as additional coverage.

## Environment and restored inputs

Tools used: Just 1.57.0, Nushell 0.116.0, Deno 2.9.7, Rust/Cargo 1.98.1, SurrealDB
3.3.0, Hurl/hurlfmt 8.0.1, podman-compose 1.6.0, cargo-audit 0.22.2.

The export omitted `config/services.toml`, `config/toolchains.toml`, both lockfiles
and referenced script/contract tests. This implementation restores those inputs.
Cargo and Deno lockfiles were generated from the supplied manifests, then checked,
compiled, exercised and audited; they cannot reproduce an unseen original lock.
No dependency manifest versions or application version were changed.

The environment's SOCKS proxy was incompatible with Deno's registry requests.
Validation cleared only that proxy setting for the tool invocation and retained
normal TLS verification with the system trust store. No insecure TLS flags or
registry-error success stubs were used. This environment adjustment is not part
of the delivered source.

## Container gates still required

`just ci` was invoked. Its Rust unit phase passed; it failed at the image phase
because this host has no runnable Podman/podman-compose installation. A native
user-namespace probe also failed with `write /proc/self/uid_map: Operation not
permitted`. Package installation could not change the required UID/group setup.
**Full container CI and `just build` are not marked passed.**

On a capable Podman host, execute from the server root:

```console
just prepare
just ci
just build
just run
```

Verify the following actual-runtime boundaries:

1. Both image builds, including the reused static Nushell binary and locked Cargo
   build, succeed for the host architecture.
2. Exactly two project pods and two workloads appear; both use the owned shared
   network and the published loopback ports from configuration.
3. Container UID `65532` can read the mounted runtime TOML and write its intended
   named volume; SELinux labelling and rootless volume initialization work.
4. First start initializes once. Stop/restart retains an inserted DB record and
   an artifact. Ordinary run upgrades without reseeding. Explicit reset removes
   only the selected project's owned DB and artifact volumes.
5. Ctrl-C, SIGTERM, stop during image build/startup, engine failure, DB failure and
   unhealthy transitions stop the peer, drain the engine and return the correct
   status. No startup descendants or log followers remain.
6. Development and disposable tests can coexist without resource deletion or
   port collisions. Port probes precede container bind and cannot reserve a port
   against unrelated host processes; collisions must fail and clean up.
7. Production initialize/upgrade/reset behavior is exercised against disposable
   production-named storage with explicit credentials and the exact reset
   confirmation. No production deployment was performed here.

Production backup/restore, external TLS, credential rotation, queue durability,
provider delivery semantics, realistic load and cross-platform container execution
remain deployment-specific concerns; this script integration does not alter their
existing application contracts.
