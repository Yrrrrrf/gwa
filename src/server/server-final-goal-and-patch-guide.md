# Server completion and patch handoff

Date: 2026-10-16  
Scope: finish the existing server lifecycle integration and resolve the reported container storage failure.

## Assignment for the patching agent

Patch the current server so that `just run`, executed inside the server directory, reliably owns a complete foreground server session: SurrealDB in one Podman pod and the Rust engine in another. Compose wires their runtime resources from one canonical definition. Both workloads remain running together after their startup prerequisites pass.

Start with the reported datastore permission failure. Then verify the remaining container boundaries using real rootless Podman. Preserve the agreed structure and working application behavior. This document is a handoff; no implementation fix was applied while producing it.

The workflow and scope below are already agreed with the user. Inspect the current checkout and applicable `AGENTS.md` / project skills before editing, then proceed with this scope. Reopen alignment only if new evidence requires changing an agreed requirement.

## Agreed requirements

| Area | Required final behavior |
| --- | --- |
| Entry point | Run `just run` from the server directory. It starts and supervises the server stack only. |
| Workloads | Exactly two workload pods: one DB pod and one Rust engine pod. |
| Client | No client process, client build, or client orchestration. |
| Recipe structure | One server-root `justfile`, importing the existing five `scripts/*.just` files. No component Justfiles. |
| Supporting code | Keep the existing `scripts/runtime.ts` supervisor and existing configuration/SQL owners. Avoid another orchestration layer. |
| Runtime topology | One canonical `compose.yaml`; select its `db` and `engine` profiles through separate Compose projects. |
| Configuration | Authored TOMLs own settings and defaults; Compose owns container definitions. Generated state is a projection, not another manually maintained configuration. |
| Persistence | Ordinary run, stop, and restart retain DB records and artifacts. Reset is explicit and checks resource ownership. |
| Application scope | Keep version `0.1.0`, Rust application contracts, protobufs, schema definitions, migrations, and seeds. Fix integration at its owning boundary. |
| Completion | Actual container builds, writable persistent storage, lifecycle behavior, and the existing validation pipeline must work on a capable host. |

All file paths below are relative to the server root, which may live at `src/server` in the full repository. Repository-root orchestration is outside this patch.

## Existing topology to preserve

For a selected root project `<project>`:

| Resource | Current name / relationship |
| --- | --- |
| DB Compose project | `<project>-db`, selecting profile/service `db` |
| DB pod and container | `<project>-db-pod`; `<project>-db` |
| Engine Compose project | `<project>-engine`, selecting profile/service `engine` |
| Engine pod and container | `<project>-engine-pod`; `<project>-engine` |
| Shared external network | `<project>-network` |
| External DB volume | `<project>-database` mounted at `/data` |
| External artifact volume | `<project>-artifacts` mounted at `/artifacts` |
| Private snapshot | `.state/<project>.json` |
| Mounted engine configuration | `.state/<project>.toml` |

The existing implementation invokes the same Compose file twice because its Podman pod configuration applies to the selected Compose project. Keep the two real pods; two ordinary containers alone do not meet the requirement.

The current file uses `x-podman.in_pod` projected through `GWA_POD`, with pod arguments `--infra=false`, `--share=`, and a project ownership label. Each workload has its own network namespace and joins the shared network. Verify the generated runtime topology rather than relying only on YAML parsing.

The engine currently has no database client. DB readiness and schema preparation are stack prerequisites. Preserve the meaning of the engine's `/ready` endpoint; adding a DB SDK or a new application dependency is outside this integration task.

## Intended lifecycle

1. Acquire the project session lock and project configuration once.
2. Build the DB image, then the engine image, which reuses its Nushell binary.
3. Validate ownership of existing resources; prepare the network and persistent storage.
4. Start the DB pod and wait for real DB readiness.
5. Initialize an empty database, or validate history and apply pending migrations to an initialized database.
6. Start the engine pod and wait for engine readiness.
7. Print the configured endpoints, stream labelled logs, and monitor both workloads.
8. On Ctrl-C, SIGTERM, or `just stop`, stop the session and both pods while retaining volumes.
9. On startup/runtime failure, return nonzero, stop owned peer resources, and report any cleanup failure without replacing the original cause.

Startup prerequisites are ordered. “Running together” means both workloads stay alive concurrently after startup; it does not require racing engine startup against DB initialization.

Keep the existing bounded process-group cancellation, same-project session exclusion, and stop coordination. Log followers and startup descendants must not outlive teardown. Observation commands (`logs`, `status`) must not regenerate configuration.

Both supplied profiles use upgrade semantics. Initialization seeds only once. Repeated ordinary starts must not reset or reseed. Production reset retains its explicit confirmation and private guard.

## Reported blocking failure

The user ran the current implementation on their host and supplied:

```text
2026-10-16T03:52:32.973729Z INFO ... Running 3.3.0 for linux on x86_64
2026-10-16T03:52:32.977282Z INFO ... Starting kvs store at absolute path surrealkv:/data/gwa
2026-10-16T03:52:32.980340Z ERROR ... IO error: Permission denied (os error 13)
Goodbye!
container failed before readiness: db
error: recipe `_ready` failed with exit code 1
error: recipe `test` failed with exit code 1
```

**Confirmed:** the DB process reaches datastore startup and cannot access the persistent datastore. The readiness failure follows that process failure. This evidence does not establish a SQL migration, credential, HTTP readiness, or Rust application defect.

**Leading hypothesis:** storage ownership/access does not match the non-root process under the host's Podman user namespace. Check filesystem ownership, existing contents, namespace mappings, mount options, and SELinux where applicable before selecting a fix. The log's `/run/user/1001` path is consistent with a user session; it does not prove the container's UID mapping.

Do not “fix” this by increasing readiness timeouts, weakening health checks, ignoring failed external commands, or switching to an in-memory datastore.

## What was verified in the delivered source

The inspected baseline is the previously delivered `server.zip`, SHA-256:

```text
95d381265a0e50a5d0695b9a980afd157ee08432149abb88c7067d7f7eb4fba0
```

Use the user's current checkout as authoritative if it has changed since that archive.

| File / boundary | Relevant current behavior |
| --- | --- |
| `db/db.Dockerfile` | Creates `/data` with mode `0770`, copies it with ownership `65532:65532`, and runs `USER 65532:65532`. |
| `engine/engine.Dockerfile` | Creates `/artifacts` with mode `0770`, copies it with ownership `65532:65532`, and runs `USER 65532:65532`. |
| `compose.yaml` | Mounts `database:/data` and `artifacts:/artifacts` as external named volumes, without an explicit `:U` ownership option. |
| `scripts/_shared.just: _volumes` | Creates volumes with `gwa_project` labels and checks existing labels. No explicit filesystem UID/GID preparation is implemented there. |
| `scripts/_shared.just: _up` | Checks resource ownership, ensures both volumes/network, then starts the selected Compose service. |
| `scripts/_shared.just: _ready` | Checks container state and actual HTTP readiness; prints recent container logs when the process exits or becomes unhealthy. |
| `scripts/test.just` | Uses a disposable `gwa-test-<suffix>` project, probes host ports, builds images, resets test storage, then starts DB before engine. |
| `scripts/runtime.ts` | Owns the foreground session, startup/shutdown, logs, monitoring, and process cancellation. |
| `scripts/deploy.just` | Owns DB initialization, migration validation/locking, and production deployment policy. |

A resource's project label authorizes lifecycle operations; it does **not** establish filesystem write access.

Image-layer directory ownership alone does not prove access to a mounted volume, especially one retained from an earlier run. Current Podman documentation describes conditional first-mount ownership adjustment for named volumes, so do not assume pre-creation always defeats it. Inspect the actual host/version and volume state. [1]

The artifact volume follows the same non-root pattern. Its failure has not been observed in the supplied log, but the patch must verify its real write path as well.

The runtime TOML permission is a separate boundary: its generated contents omit credentials and are readable by the engine's container user. Preserve the private JSON snapshot's restrictions; broadening its access will not repair the datastore.

## Investigation before patching

Capture evidence before a disposable test teardown removes its resources. The existing failed-test cleanup may already have deleted that test project's pods, volumes, and snapshot. If so, reproduce with an isolated project and instrument the failure boundary deliberately.

1. Record Podman, podman-compose, OS, rootless/rootful mode, storage driver, and whether Podman is local or backed by a machine/remote connection. Compare with `config/toolchains.toml`; the delivered Compose expectation is `1.6.0`.
2. Identify the failing project from retained state or labelled resources. A failing `just test` normally uses `gwa-test-…`, not `gwa-dev`.
3. Inspect the actual DB image/container user, mount source and destination, mount writability, process exit state, and recent DB logs.
4. Inspect the exact named volume's project label, mountpoint, driver/options, and ownership metadata available in that Podman version.
5. Check numeric ownership and modes for the mountpoint and existing `gwa` datastore entries. Compare their view on the storage host with the relevant user-namespace/container view.
6. Check user namespace mappings and SELinux denials/labels when enabled. Keep these as distinct possible causes.
7. Repeat the storage-access investigation for `/artifacts`, and verify an authenticated report/notification write through the engine.

Useful read-only starting commands (replace placeholders with inspected values):

```console
podman version
podman-compose version
podman info
podman ps -a --pod
podman pod ps
podman volume inspect <exact-volume-name>
podman inspect --format '{{.Config.User}}' <exact-container-name>
podman inspect --format '{{json .Mounts}}' <exact-container-name>
podman inspect --format '{{json .State}}' <exact-container-name>
podman logs --tail 50 <exact-container-name>
podman unshare cat /proc/self/uid_map /proc/self/gid_map
podman unshare stat -c '%u:%g %a %n' <inspected-volume-mountpoint>
```

Run storage inspection on the host/VM that actually owns Podman's storage. `podman unshare` is a local troubleshooting tool and is unavailable through the remote client. [3] Do not publish full environment/snapshot dumps containing credentials.

## Patch requirements

Choose the smallest consistent storage policy supported by the actual rootless runtime and Compose version. Implement it in the existing owning files.

- Make both fresh named volumes writable by their intended non-root workload.
- Handle retained, project-owned volumes with incompatible ownership without deleting their contents. Explain any permission migration and apply it only to the verified project volume, while its workload is stopped.
- Keep container UID/GID assumptions coherent between Dockerfiles, mount policy, and any preparation recipe. Do not hardcode the user's host UID `1001` or a guessed subordinate UID offset.
- Consider supported volume creation ownership controls, narrowly scoped ownership preparation in the correct namespace, or `:U` for these owned volumes after checking its effects. Do not combine several policies without need.
- `:U` recursively changes source ownership and can delay startup. It is not a harmless namespace alias. Current Podman documentation also restricts `idmap` mounts to rootful mode; do not propose them as an assumed rootless solution. [1][2]
- Validate project ownership before filesystem mutation as well as before deletion. Refuse foreign or ambiguously owned resources. An ownership label is a boundary to check, not permission to operate on an arbitrary supplied host path.
- Preserve data and useful diagnostics when preparation fails. A permission error must remain a failed command.
- Keep Compose as the runtime source of truth. Avoid a second set of manual `podman run` workload definitions or another generated Compose stack.
- Preserve build input fingerprints: edits affecting images must change the image identity. Existing tags combine package version and a 12-character input hash.
- Add focused regression coverage inside the existing test structure. Mock-only tests cannot prove container filesystem access.

Do not use `chmod 777`, privileged/root workload execution, global SELinux disabling, blind host-level recursive `chown`, or implicit volume deletion as the solution. Explicit reset is for intentionally disposable data; it is not the normal recovery path.

If diagnostics need improvement, include project, unit, mount target, expected process identity, and the actionable storage error. Keep secrets out of output. Do not replace the underlying DB error with a generic timeout.

## Validation and definition of done

Use a host that can actually build images and run rootless Podman pods. Start with focused reproduction, then run the existing pipeline. All destructive test scenarios below use isolated, disposable storage.

| Gate | Evidence required |
| --- | --- |
| Fresh storage | New isolated DB and artifact volumes work under the real non-root container identities; DB opens `surrealkv:/data/gwa`. |
| Existing incompatible storage | Reproduce the relevant permission mismatch on a disposable owned volume, apply the chosen repair, and preserve pre-existing contents. |
| Real server startup | `just run` reaches DB/schema and engine readiness, with exactly two workload pods and one owned shared network. |
| Artifact write | Existing authenticated report/notification behavior writes and reads its expected artifact through the containerized engine. |
| Retention | Insert a DB record and create an artifact, stop, restart with ordinary `just run`, and verify both remain. No reseeding or reset occurs. |
| Lifecycle | Ctrl-C, SIGTERM, and `just stop` terminate the session cleanly. Startup interruption and either workload failing stop the peer and report failure. |
| Ownership isolation | An unrelated same-name resource is refused before mutation. Disposable test teardown cannot delete development data. |
| Concurrent usage | Development and isolated tests use separate resources. A host port bind collision fails clearly and cleans up owned resources. |
| Observation | `logs` and `status` do not rewrite state or take ownership of a session. |
| Existing contracts | DB migration/locking/history, authenticated API consumers, health/readiness, and worker behavior still pass. |
| Pipeline | `just prepare`, `just ci`, and `just build` succeed. Preserve `ci: test-unit test check`; build retains the images tested by CI without another post-CI image build. |

Run from the server root:

```console
just prepare
just test scripts/dev
just test
just ci
just build
just run
```

Use the focused checks while developing; avoid repeatedly rerunning successful broad checks without new changes or an unresolved failure. A separate `just build` invocation currently reruns CI by design.

If production lifecycle code is affected, exercise initialize/upgrade/reset only against disposable production-profile resources with explicit credentials and the existing typed reset confirmation. Do not deploy to a real production stack to validate this patch.

## Honest validation baseline

The delivered archive's `VALIDATIONS.md` records successful checks for the previous source state:

- `just check`, 7 Rust unit tests, and 13 offline Deno contract/lifecycle tests.
- Native SurrealDB 3.3.0 plus native Rust engine: 8 Hurl files / 23 requests and 9 Deno consumer cases, including migration lifecycle coverage.
- Compose profile parsing and pod command generation using podman-compose 1.6.0; the pod generation check was a dry run with a fake Podman inventory boundary.

Those checks did not establish working images, rootless volume permissions, or real pod execution. Full container CI/build was explicitly left unverified because the previous environment lacked a runnable Podman setup and could not create the required user namespace.

The user's new failure is evidence at that previously unverified container boundary. Preserve prior tests, add the focused storage proof, and update the validation record with actual results. A native process run or a Compose dry run cannot substitute for the failing rootless-container scenario.

## Expected delivery from the patching agent

Deliver a focused server patch, updated server documentation/validation record, and an updated server-only archive if that remains the delivery format.

Report the proven cause, the storage policy selected and why it fits this host, which files changed, and the real commands/results used to validate it. Distinguish completed gates from any unavailable environment checks. Completion means the agreed `just run` workflow and retained storage work in actual containers.

## Primary runtime references

Consult the documentation matching the installed Podman version; these current official pages were checked while preparing this handoff:

1. [Podman run — volume ownership, labels, and mount options](https://docs.podman.io/en/latest/markdown/podman-run.1.html)
2. [Podman volume create — ownership controls and options](https://docs.podman.io/en/latest/markdown/podman-volume-create.1.html)
3. [Podman unshare — rootless namespace inspection and remote-client limitation](https://docs.podman.io/en/latest/markdown/podman-unshare.1.html)

