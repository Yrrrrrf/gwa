# Harness Refactoring Plan: Modular `scripts/cli/*` Architecture

This plan defines the architectural decomposition and implementation roadmap to refactor [`scripts/harness.nu`](scripts/harness.nu) into a modular, decoupled CLI suite under `scripts/cli/*`.

---

## 🎯 Objectives & Invariants

1. **Eliminate Duplicated Runner Boilerplate**: Replace repetitive loops in `types`, `tests`, and `build` dashboards with a single, generalized higher-order runner ([`run-suite`](scripts/cli/runner.nu)) and execution step ([`exec-step`](scripts/cli/runner.nu)).
2. **Zero Hardcoded Package Names**: Remove static package routing (e.g. `["state", "ui"]`). Detect package capabilities (Svelte vs Deno, Vitest vs Deno test) declaratively via filesystem introspection (`vite.config.*`, `tsconfig.json`, `.svelte`).
3. **Directory Isolation**: Eliminate stateful `cd $dir ... cd ../..` mutations in the parent shell by executing in isolated subshell contexts with explicit `--cwd`.
4. **Enhanced Verbose (`-v`) Mode**: Provide clear execution command traces (`[EXEC] <cmd> in <cwd>`), precise timing breakdowns, and indented stream markers (`│`).
5. **Zero Breaking Changes**: Retain [`scripts/harness.nu`](scripts/harness.nu) as a thin façade (`export use cli *`) so all recipes in [`justfile`](justfile), [`scripts/check.just`](scripts/check.just), [`scripts/test.just`](scripts/test.just), [`scripts/dev.just`](scripts/dev.just), and [`scripts/deploy.just`](scripts/deploy.just) continue working seamlessly.

---

## 🏛️ Target Architecture & File Matrix

```text
scripts/
├── harness.nu               # Backwards-compatible façade: `export use cli *`
└── cli/
    ├── mod.nu               # Root module re-exporting the CLI surface
    ├── ui.nu                # Visuals: chevron, metric, badge, banners (gum), print-stream
    ├── workspace.nu         # Declarative package inspection & maintenance (prune, prepare, node compat)
    ├── runner.nu            # Core engine: exec-step, run-suite, parsers (parse-count, parse-test-stats)
    └── gates.nu             # Declarative gates: run-types-dashboard, run-tests-dashboard, run-build-dashboard
```

### Module Responsibilities

| Module | Responsibilities | Key Functions |
| :--- | :--- | :--- |
| **`ui.nu`** | ANSI colors, metrics formatting, standardized status badges, styled banners, and indented log streams. | `chevron`, `metric`, `badge`, `print-stream`, `banner` |
| **`workspace.nu`** | Dynamic filesystem introspection, package metadata derivation (zero hardcoding), cache pruning, dependency installation, and SvelteKit syncing. | `inspect-package`, `workspace-categories`, `app-packages`, `sdk-packages`, `run-prune-workspace`, `run-prepare-workspace` |
| **`runner.nu`** | Isolated process execution with spinner / verbose logging, output parsers, and the generalized category suite orchestrator. | `exec-step`, `run-suite`, `parse-count`, `parse-test-stats` |
| **`gates.nu`** | Declarative wrappers connecting workspace targets and runner logic for types, tests, and build. | `run-types-dashboard`, `run-tests-dashboard`, `run-build-dashboard` |
| **`mod.nu`** | Re-exports all public API functions from `ui`, `workspace`, `runner`, and `gates`. | `export use ...` |
| **`harness.nu`** | Thin single-line wrapper: `export use cli *`. | Root entry point for `just` |

---

## 🛠️ Implementation Phases — ✅ COMPLETE

- [x] **Phase 1: Visual & Streaming Foundation (`scripts/cli/ui.nu`)**
  - Implemented `chevron`, `metric`, `badge`, `banner`, and `print-stream`.
- [x] **Phase 2: Dynamic Workspace Introspection (`scripts/cli/workspace.nu`)**
  - Implemented `inspect-package` (zero hardcoded package names, detects Svelte/Vite vs Deno, and test files).
  - Implemented `workspace-categories`, `app-targets`, `run-prune-workspace`, and `run-prepare-workspace`.
- [x] **Phase 3: Generic Execution & Suite Runner (`scripts/cli/runner.nu`)**
  - Implemented `exec-step` with directory isolation (`--cwd`), timing, `gum spin`, and command tracing.
  - Implemented `run-suite` generalized coordinator and regex parsers (`parse-count`, `parse-test-stats`).
- [x] **Phase 4: Declarative Dashboards (`scripts/cli/gates.nu`)**
  - Implemented `run-types-dashboard`, `run-tests-dashboard`, and `run-build-dashboard` on top of `run-suite`.
- [x] **Phase 5: Facade & Module Wiring (`scripts/cli/mod.nu`, `scripts/harness.nu`)**
  - Created `scripts/cli/mod.nu` re-exporting all submodules.
  - Updated `scripts/harness.nu` to a thin façade (`export use cli *`).
- [x] **Phase 6: Live Verification & Testing**
  - Verified `just prepare`, `just check`, `just test`, `just build`, `just ci`, `just types -v`, and `just test -v`.

---

## 🏁 Exit Criteria & Verification Matrix — ✅ ALL PASSED

| Gate | Execution Command | Verification / Expected Result | Status |
| :--- | :--- | :--- | :---: |
| **Workspace Hygiene** | `just prepare` | Successfully pruned caches, installed Deno packages, created Vite symlink, and synced SvelteKit. | ✅ PASS |
| **Type Check Gate** | `just check` | Runs `fmt`, `lint`, and `types`. Verified SDK + APP with 0 errors across 48 files. | ✅ PASS |
| **Test Suite Gate** | `just test` | Dispatched Vitest for Svelte packages and `deno test` for pure Deno packages. Accurately flagged `[no tests]`. | ✅ PASS |
| **Build Gate** | `just build` | Pre-synced SvelteKit and compiled `apps/vision` to `apps/vision/build` in ~2.5s. | ✅ PASS |
| **CI Convergence** | `just ci` | Executed `check` + `test` sequentially without errors. | ✅ PASS |
| **Verbose Tracing** | `just types -v`<br>`just test -v` | Emitted explicit `[EXEC]` command traces and structured stream indentation markers (`│`). | ✅ PASS |
| **Code Modularity** | Code Review | `scripts/harness.nu` is reduced to 2 lines; zero hardcoded package names in `scripts/cli/*`. | ✅ PASS |
