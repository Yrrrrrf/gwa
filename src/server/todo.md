# Template Server — Microkernel Finalization Plan

**Spec Version**: 2.0 (supersedes v1.0 integration plan)
**Date**: 2026-04-18
**Status**: Phases 1–5 complete; Phase 6 ready for execution
**Reference**: Working stack from `server.md`, validated by `server-test.md`, wired by v1.0 plan through the preflight check. This revision closes the gap to a genuinely zero-boilerplate template.

---

## 0. Executive Summary

The server is now wired correctly at the data plane: schema bugs are fixed, the Rust engine and Go sidecar can be started, the preflight check accurately reports service health, and the Deno suite produces readable errors when services are down. What remains is committing to a specific **dev-environment philosophy** and making the template strict enough that a fresh clone needs zero hand-tuning. This revision pivots Phase 4 from containerization-for-CI to **microkernel-via-Nix**: `nix develop` is the runtime shell, `podman` is used for exactly one thing (the stateful SurrealDB), and every other process (engine, sidecar, tests) runs as a native process in the Nix shell. Phase 5 hardened the stack orchestration and test suite, ensuring reliable local iteration. Phase 6 is the final polish for a true template: a cleanup checklist for people cloning it, a `doctor` recipe for diagnosing setup issues, and no lingering shell scripts, stub Dockerfiles, or boilerplate that the template user would have to delete. When this plan lands, `nix develop && just server run` (terminal 1), `just server test` (terminal 2), green, done.

---

## 1. Context & Constraints

### Current State (after Phases 1–5)

- ✅ **Schema fixed**: `references<session>` on user enables CASCADE, role enum aligned, missing User fields defined.
- ✅ **Orchestration working**: `just server run` starts all three services natively (except DB) with a robust shell trap and health polling.
- ✅ **Preflight working**: `just server status` accurately reports stack health.
- ✅ **Test suite hardened**: RPC client uses native gRPC, assertions handle SurrealDB 3 quirks, schema has auto-updating timestamps.

### What's Left

- Phase 6: Final polish (README rewrite, TEMPLATE.md cleanup checklist, `doctor` recipe).

---

### Phase 4 — Microkernel Finalization ✅ COMPLETE

- **Goal**: Commit fully to microkernel-via-Nix. `nix develop` is the shell. Only the DB is containerized. All stray shell scripts are gone. The justfile reads like a clean template.
- **Components to build**:
  1. **Finalize `flake.nix`**. Added full toolset (cargo, go, deno, buf).
  2. **Finalize `server.just` `run` recipe**. Orchestration with cleanup traps.
  3. **Add `build-grpc` recipe**. Regenerates Go stubs.
  4. **Update `build` recipe**. Aggregates all build steps.
  5. **Remove legacy shell scripts**. Deleted tests/*.sh and scripts/.
  6. **Remove Dockerfile stubs**. Only db/db.Dockerfile remains.
  7. **Add `.env.example`**. Canonical reference.
  8. **Finalize `down` recipe**. Clean teardown.

---

### Phase 5 — Architecture Fitness & Test Hardening ✅ COMPLETE

- **Goal**: Ensure reliable stack orchestration and accurate test reporting.
- **Components to build**:
  1. **Fix RPC Test Client**. Switched to `grpcurl` for native gRPC compatibility.
  2. **Harden DB Schema**. Added `created_at`/`updated_at` to all tables with auto-update logic.
  3. **Fix DB Functions**. Cast `title` and `description` to string for `string::lowercase`.
  4. **Improve Assertions**. Updated `assertError` to catch SurrealDB 3 assertion failures.
  5. **Orchestration Tuning**. Fixed `run` recipe paths, cleanup, and startup sequence.

---

### Phase 6 — Template Polish

- **Goal**: A stranger can clone the repo, read one file, and know what they need to delete/rename for their own project.
- **Components to build**:

  1. **Rewrite `README.md`** with microkernel quickstart + feature matrix.
  2. **Create `TEMPLATE.md`** — the cleanup checklist for forking the template.
  3. **Add `just server doctor`** — diagnoses common issues (Nix env, Podman state, port conflicts).
  4. **Add `just server pre-commit`** — runs `fmt lint typecheck status`.
  5. **Clean up `deploy` recipe** — trim to minimal template message.

- **Dependencies**: Phases 4 and 5.
- **Exit criteria**:
  - A dev unfamiliar with the repo reads only `README.md` and reaches green tests in under 5 minutes.
  - `just server doctor` on a broken setup prints the exact command to fix it.
  - `just server fitness` (or pre-commit) still green.
