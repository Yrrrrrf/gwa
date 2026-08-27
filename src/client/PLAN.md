# Ephemeral Output & Styled Command Preview Plan

This plan outlines the design and implementation to upgrade [`scripts/cli/*`](scripts/cli) with:
1. **Styled Command Previews** (bare commands in italics with dynamic targets in bold `<item>`).
2. **Ephemeral Rolling Viewport** (Docker BuildKit / Podman style live tail of ~8–10 dim lines that cleanly vanishes upon completion).

---

## 🎯 Objectives & Invariants

1. **Styled Command Preview**:
   - Print the exact command template under each suite header (`🧪 TEST`, `🛡️ TYPES`, `📦 BUILDING APPLICATIONS`).
   - Pure command syntax only (no conversational prose like *"Running tests with..."*).
   - Fixed executable & flags in `(ansi italic)(ansi grey)`.
   - Dynamic target arguments in bold cyan `<...>` (e.g. `<sdk/*>`, `<tsconfig.json>`, `<apps/*>`).

2. **Ephemeral Rolling Output Viewport (Docker/Podman Build Style)**:
   - While a task is in flight:
     - Display the step line with a cyan spinner (`⠋`, `⠙`, `⠹`, `⠸`, `⠼`, `⠴`, `⠦`, `⠧`, `⠇`, `⠏`).
     - Display a live rolling tail of the last 8–10 lines of child process output in `(ansi d)(ansi grey)    │ <line>(ansi reset)`.
   - When the task completes:
     - Rewind and erase the temporary viewport using ANSI cursor codes (`\e[<N>A\e[0J\r\e[K`).
     - Overwrite the spinner line with the permanent badge row:
       `  ❯❯ vitest        state   (3 passed, 0 failed, 0 skipped)`
     - If the command fails (`exit_code != 0` or errors > 0): preserve the diagnostic logs with red vertical bars so failures are immediately visible.

3. **Post-Noise Consolidated Overview in Verbose (`-v`) Mode**:
   - In `-v` mode, full step command traces and stdout/stderr streams are displayed in real-time as they run.
   - At the end of the suite, after all the verbose log output, a consolidated **Summary / Overview Dashboard** is rendered with all package badges grouped by category before the final banner.
   - Developers get both the deep diagnostic logs *and* a clean, unified summary without scrolling back through hundreds of lines of terminal noise.

4. **Performance & Reliability Invariants**:
   - Use Nushell native background job management ([`job spawn`](https://www.nushell.sh)) and streaming file buffers.
   - Zero terminal corruption: ensure cursor coordinates and line counts are strictly tracked.
   - Maintain clean fallback handling for non-TTY / CI execution.

---

## 📐 Architecture Updates

```text
scripts/cli/
├── ui.nu            <-- Added: render-cmd-preview, clear-viewport, spinner-frames
├── runner.nu        <-- Updated: exec-step with live tailing buffer + ANSI rollback
└── gates.nu         <-- Updated: pass styled command templates into run-suite
```

### 1. `scripts/cli/ui.nu` Additions
* `render-cmd-preview [base: string, target_tag: string, trailing: string = ""]`:
  Renders styled command line: `(ansi i)(ansi grey)($base) (ansi cyan_bold)<($target_tag)>(ansi reset) (ansi i)(ansi grey)($trailing)(ansi reset)`
* `clear-viewport [lines_count: int]`:
  Emits `\e[($lines_count)A\e[0J\r\e[K` to wipe the temporary trailing lines and current line.
* Spinner character generator: `["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]`.

### 2. `scripts/cli/runner.nu` Updates
* `exec-step`:
  - Spawns command in background via `job spawn` while redirecting `o+e>` to a temporary stream file.
  - In a tight refresh loop (~60–80ms):
    - Updates spinner frame on the step header.
    - Reads the last 8 lines of the stream file and prints them prefixed with `(ansi grey)│ (ansi d)...`.
    - Rewinds cursor for the next frame.
  - On exit:
    - Erases ephemeral lines cleanly via `clear-viewport`.
    - Returns full `{ stdout, stderr, exit_code, elapsed }` record for parser badge evaluation.
* `run-suite`:
  - Receives an optional `--cmd-preview: string` parameter and renders it under the main title.
  - If a step fails, prints the captured failure stream with red bars.
  - In `-v` mode, collects all formatted badge status rows and renders a consolidated **Post-Noise Summary / Overview Dashboard** after all verbose streams complete, right before the final banner.

### 3. `scripts/cli/gates.nu` Updates
* `run-types-dashboard`:
  Configures preview: `deno run -A npm:svelte-check --tsconfig <tsconfig.json> --config <vite.config>` / `deno check <src/mod.ts>`.
* `run-tests-dashboard`:
  Configures preview: `deno run -A npm:vitest run --config ./config/vitest.config.ts --project <sdk/*>` / `deno test --allow-all <dir>`.
* `run-build-dashboard`:
  Configures preview: `deno run -A npm:vite build (in <apps/*>)`.

---

## 🛠️ Implementation Phases — ✅ ALL COMPLETE

- [x] **Phase 1: Terminal Visuals & Cursor Mechanics (`scripts/cli/ui.nu`)**
  - Implemented `render-cmd-preview` with italics + bold cyan `<target>` tags.
  - Implemented `clear-viewport` and `SPINNER_FRAMES`.
- [x] **Phase 2: Live Viewport Runner & Verbose Overview (`scripts/cli/runner.nu`)**
  - Enhanced `exec-step` with `job spawn` background execution, rolling buffer reader (last 8 lines), and cursor rewind loop.
  - Diagnostic logs remain pinned with red bars on error.
  - Implemented consolidated `📊 OVERVIEW` summary table printed after all verbose stream noise in `-v` mode.
- [x] **Phase 3: Quality Gates Preview Wiring (`scripts/cli/gates.nu`)**
  - Wired command preview strings into `run-types-dashboard`, `run-tests-dashboard`, and `run-build-dashboard`.
- [x] **Phase 4: Live Verification & Testing**
  - Verified `just check`, `just test`, `just build`, `just ci`, `just types -v`, and `just test -v`.
  - Confirmed live rolling viewport, clean wipeout upon completion, and post-noise verbose dashboard.

---

## 🏁 Exit Criteria & Verification Matrix — ✅ ALL PASSED

| Step | Command | Verification Check | Status |
| :--- | :--- | :--- | :---: |
| **Command Preview** | `just test`<br>`just check`<br>`just build` | Under the suite header, the styled command template displays with italics and `<bold-target>`. No conversational filler text. | ✅ PASS |
| **Live Ephemeral Output** | Interactive terminal | While tasks run, an ephemeral window of up to 8 dim lines streams with `│` vertical bars. | ✅ PASS |
| **Clean Wipeout on Success** | All gates | Upon command success, the 8 dim lines vanish completely; the final row displays only the permanent badge `(passed, failed, skipped)` or `(files, errors, warnings)`. | ✅ PASS |
| **Diagnostic Pin on Failure** | Simulated failure | If a task fails, the output logs are NOT erased; they remain pinned with red error bars for debugging. | ✅ PASS |
| **Post-Noise Verbose Overview** | `just test -v`<br>`just types -v` | Streams full noisy logs during execution, then renders the consolidated clean summary overview dashboard at the bottom before the banner. | ✅ PASS |

