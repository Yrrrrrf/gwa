# Harness CLI v0.1: Persistent Bottom Dashboard & Concrete Command Manifest

This plan details the v0.1 architectural enhancement of the GWA CLI harness (`scripts/cli/*`).

---

## 🎯 Core Objectives

1. **Crisp Template Command (Non-Dim)**:
   - Render the generic suite command template in distinct italic foreground (not dim), with `<placeholders>` highlighted in **bold cyan** `(ansi cyan_bold)`.
2. **Concrete Command Manifest (Normal Foreground, Bold Files)**:
   - List the exact, root-relative commands to be executed for each target in clean normal foreground (not dim), with dynamic `<files>` or package paths highlighted in **bold** `(ansi default_bold)`.
3. **Verbose Mode (`-v`) Scoped Execution Flow**:
   - In `-v` mode, each concrete command prints in normal foreground, and its unbuffered stdout/stderr output streams directly below that exact command.
   - The persistent dashboard table sits below, reflecting completed and active tasks.
4. **Standard Mode Pinned-Bottom Dashboard**:
   - In standard mode, concrete commands are listed upfront.
   - The active task streams its output into a clamped 5-line window **above** the table.
   - Every line is clamped to `(term size).columns - 8` to make terminal line-wrapping impossible (eliminating horizontal Vite overlap and duplicate ghost lines).
5. **Unified Single-Source Overview**:
   - Dropped the redundant separate `📊 OVERVIEW` section. The bottom dashboard table serves as the permanent, single source of truth for both standard and verbose runs.

---

## 🎨 Visual Specifications & Styling

### 1. Template Command (Crisp, Non-Dim)
Rendered under the suite header in distinct italic without dimming, with placeholders in bold cyan:
```text
🛡️ TYPES
  deno run -A npm:svelte-check --tsconfig <tsconfig.json> --config <vite.config>
```

### 2. Concrete Commands (Normal Text, Bold Files)
Rendered in standard normal foreground (not dim), with the target files/paths highlighted in **bold**:
```text
  deno run -A npm:svelte-check --tsconfig config/tsconfig.json --config sdk/ui/vite.config.ts
  deno run -A npm:svelte-check --tsconfig config/tsconfig.json --config sdk/state/vite.config.ts
  deno run -A npm:svelte-check --tsconfig apps/vision/tsconfig.json --config apps/vision/vite.config.mts
  deno check sdk/core/src/mod.ts
  deno check sdk/api/src/mod.ts
```

---

## 🖥️ Terminal Execution Flows

### Standard Mode (`just types -b`)
While executing, live output streams in a clamped 5-line window **above** the table:

```text
🛡️ TYPES
  deno run -A npm:svelte-check --tsconfig <tsconfig.json> --config <vite.config>

  deno run -A npm:svelte-check --tsconfig config/tsconfig.json --config sdk/ui/vite.config.ts
  deno run -A npm:svelte-check --tsconfig config/tsconfig.json --config sdk/state/vite.config.ts
  deno run -A npm:svelte-check --tsconfig apps/vision/tsconfig.json --config apps/vision/vite.config.mts
  deno check sdk/core/src/mod.ts
  deno check sdk/api/src/mod.ts

    │ Loading svelte-check in workspace: .../sdk/ui
    │ Getting Svelte diagnostics...
    │ Initializing typescript...

[SDK]
  ❯❯ svelte-check  ui      ⠙ running...
  ❯❯ svelte-check  state   (pending)
  ❯❯ deno          core    (pending)
  ❯❯ deno          api     (pending)

[APP]
  ❯❯ svelte-check  vision  (pending)
```

Upon completion, the temporary 5 log lines above the table vanish cleanly. The table displays final badges and elapsed times, followed directly by the banner:

```text
🛡️ TYPES
  deno run -A npm:svelte-check --tsconfig <tsconfig.json> --config <vite.config>

  deno run -A npm:svelte-check --tsconfig config/tsconfig.json --config sdk/ui/vite.config.ts
  deno run -A npm:svelte-check --tsconfig config/tsconfig.json --config sdk/state/vite.config.ts
  deno run -A npm:svelte-check --tsconfig apps/vision/tsconfig.json --config apps/vision/vite.config.mts
  deno check sdk/core/src/mod.ts
  deno check sdk/api/src/mod.ts

[SDK]
  ❯❯ svelte-check  ui      (27 files, 0 errors, 0 warnings) (1.56s)
  ❯❯ svelte-check  state   (4 files, 0 errors, 0 warnings) (1.63s)
  ❯❯ deno          core    (6 files, 0 errors, 0 warnings) (72ms)
  ❯❯ deno          api     (1 files, 0 errors, 0 warnings) (72ms)

[APP]
  ❯❯ svelte-check  vision  (10 files, 0 errors, 0 warnings) (1.77s)

✓ 0 type errors across all workspaces (total: 5.2s)
```

---

### Verbose Mode (`just types -v -b`)
In `-v` mode, each concrete command is printed, and its detailed output streams directly below that exact command:

```text
🛡️ TYPES
  deno run -A npm:svelte-check --tsconfig <tsconfig.json> --config <vite.config>

  deno run -A npm:svelte-check --tsconfig config/tsconfig.json --config sdk/ui/vite.config.ts
    │ Loading svelte-check in workspace: /home/yrrrrrf/.../sdk/ui
    │ Getting Svelte diagnostics...
    │ svelte-check found 0 errors and 0 warnings

  deno run -A npm:svelte-check --tsconfig config/tsconfig.json --config sdk/state/vite.config.ts
    │ Loading svelte-check in workspace: /home/yrrrrrf/.../sdk/state
    │ Getting Svelte diagnostics...
    │ svelte-check found 0 errors and 0 warnings

[SDK]
  ❯❯ svelte-check  ui      (27 files, 0 errors, 0 warnings) (1.56s)
  ❯❯ svelte-check  state   (4 files, 0 errors, 0 warnings) (1.63s)
  ❯❯ deno          core    (6 files, 0 errors, 0 warnings) (72ms)
  ❯❯ deno          api     (1 files, 0 errors, 0 warnings) (72ms)

[APP]
  ❯❯ svelte-check  vision  (10 files, 0 errors, 0 warnings) (1.77s)

✓ 0 type errors across all workspaces (total: 5.2s)
```

---

## 🛠️ Implementation Phases — ✅ ALL COMPLETE

- [x] **Phase 1: Terminal UI Formatter (`scripts/cli/ui.nu`)**
  - Implemented `render-cmd-template`: Non-dim italic with `<placeholders>` in bold cyan.
  - Implemented `render-cmd-list`: Normal foreground with `<files>` in bold.
  - Implemented `safe-clamp`: Clamps lines to `(term size).columns - 8` so terminal line-wrapping is impossible.
- [x] **Phase 2: Quality Gates Command Manifest (`scripts/cli/gates.nu`)**
  - Updated `$resolver` across `run-types-dashboard`, `run-tests-dashboard`, and `run-build-dashboard` to provide normalized root-relative `display_cmd` with `<files>` highlighted.
- [x] **Phase 3: Runner Engine Overhaul (`scripts/cli/runner.nu`)**
  - Upfront concrete command list rendering.
  - Pinned-bottom table state management (`pending`, `running`, `done`, `skipped`).
  - Standard mode 5-line clamped viewport positioned above the table.
  - Verbose mode per-command output placement.
  - Clean wipeout of temporary log area and removal of duplicate `📊 OVERVIEW`.
- [x] **Phase 4: Verification & Validation**
  - Verified `just types`, `just types -b`, `just test`, `just test -b`, `just build`, `just build -b`, and `just ci -b`.
  - Confirmed zero line wrapping, zero ghost lines, and proper banner placement.
- [x] **Phase 5: Zero-Leak Terminal & Live Verbose Dashboard (`scripts/cli/ui.nu`, `scripts/cli/runner.nu`)**
  - Replaced external `^gum style` in `banner` with native Nushell ANSI formatting (`(ansi -e { fg: $color, attr: b })`) to completely eliminate OSC 11 (`\e]11;?`) background color queries that were leaking `^[]11;rgb:...` into stdout/stdin.
  - Eliminated `(term size)` polling within runner loops, eradicating DSR cursor report leaks (`^[[...R`).
  - Redesigned verbose (`-v`) execution so the dashboard table is permanently rendered at the bottom from the start, live-streaming command logs above it while keeping spinners and completed states synchronized.
- [x] **Phase 6: Centralized CLI Flag Parser & Inheritance Fix (`scripts/cli/flags.nu`, `scripts/check.just`, `scripts/test.just`, `scripts/deploy.just`)**
  - Created centralized `parse-cli-flags` in `scripts/cli/flags.nu` to tokenize inputs by whitespace and support grouped shorthand flags (`-vb`, `-bv`, `-vd`, `-bd`).
  - Fixed Just string packing bug where dependency recipes (`check`, `types`, `test`) received packed string arguments (e.g. `"-v -b"`) causing flags to be silently ignored.
  - Replaced duplicate parsing boilerplate in `check.just`, `test.just`, and `deploy.just` with clean single-line calls to `parse-cli-flags`.
  - Added safe path expansion in `gates.nu` (`path expand | path relative-to $env.PWD`) to ensure both relative and absolute paths convert reliably.
- [x] **Phase 7: Build Command Normalization & Flag-Aware Preview / Dev (`scripts/cli/gates.nu`, `scripts/deploy.just`, `scripts/dev.just`)**
  - Updated application build command from pseudo-syntax `(in apps/vision)` to standard runnable shell syntax: `cd <apps/vision> && deno run -A npm:vite build` (with `<apps/*>` in cyan bold in template, and concrete paths in bold).
  - Fixed `apps/-v` bug in `preview` by decoupling target app from flags using `parse-cli-flags` and adding typed `def --wrapped main` signatures per `.skills/ci/nushell`.
  - Updated `run` in `dev.just` with flag-aware app selection and native `banner` formatting.

---

## 🏁 Exit Criteria & Verification Matrix — ✅ ALL PASSED

| Step | Command | Verification Check | Status |
| :--- | :--- | :--- | :---: |
| **Crisp Template** | `just types` | Suite template line is distinct italic (non-dim) with `<placeholders>` in bold cyan. | ✅ PASS |
| **Bold Files Manifest** | `just types` | Concrete commands list in normal text with `<files>` in bold. | ✅ PASS |
| **Logs Above Table** | `just types -b` | While running, live logs stream in 5 clamped lines ABOVE the dashboard table. | ✅ PASS |
| **Zero Glitches** | `just build`<br>`just test` | Long Vite build lines do not wrap or overlap horizontally; no ghost `running...` lines remaining. | ✅ PASS |
| **Unified Overview** | `just test -v` | No separate duplicate `OVERVIEW` block; bottom table contains all final stats and durations. | ✅ PASS |
| **Zero Escape Leaks** | `just ci -v` | No `^[]11;rgb:...` or `^[[...R` escape codes leak into output or prompt. | ✅ PASS |
| **Live Verbose Table** | `just ci -v` | In `-v` mode, the dashboard table is visible at the bottom throughout the entire execution. | ✅ PASS |
| **Combined Flags** | `just ci -v -b` | Both verbose logs and benchmark durations display across `types` and `test`. | ✅ PASS |
| **Grouped Flags** | `just ci -vb` | Grouped shorthand `-vb` works identically to `-v -b`. | ✅ PASS |
| **App Target & Flags** | `just build vision -vb` | Extracts `vision` target app and enables both verbose and bench modes cleanly. | ✅ PASS |
| **Runnable Build Command** | `just build -b` | Template displays `cd <apps/*> && deno run -A npm:vite build` and concrete commands display `cd apps/vision && deno run -A npm:vite build`. | ✅ PASS |
| **Flag-Aware Preview** | `just preview -vb` | Resolves target app cleanly without attempting `cd apps/-v`; inherits build flags. | ✅ PASS |



