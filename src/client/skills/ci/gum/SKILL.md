---
name: gum
description: >-
  Build interactive shell scripts, CLI prompts, and styled terminal UIs with charmbracelet/gum. Covers input, write, choose, confirm, filter, file, spin, style, table, join, format, pager, and log commands. Reach for this whenever writing interactive bash, zsh, nushell, or justfile scripts. Also use when fixing TTY stdin redirection errors, exit-code handling on cancellation, or styling terminal outputs.
metadata:
  repo: charmbracelet/gum
  version: 0.17.0
  verified: 2026-08-01
  source_of_truth: charmbracelet/gum official documentation and CLI surface
---

# [[gum]] [[skill]]

> [!abstract] Purpose
> Use this skill to build interactive CLI shell scripts and styled terminal utilities with `charmbracelet/gum`. Covers prompt capture (`input`, `write`, `choose`, `confirm`, `filter`, `file`), terminal layout & styling (`style`, `table`, `join`, `format`, `pager`, `log`), and process execution spinners (`spin`).

## 📥 Inputs

- **Context:** Bash, Zsh, Nushell, or `justfile` scripts executing in a TTY terminal.
- **Constraints:** Requires the `gum` executable available in `$PATH`. Interactive prompt commands require an active TTY (`/dev/tty`).
- **Anti-use:** Not for building standalone, stateful multi-screen Go TUI applications — use **Bubble Tea** for full Go applications.

## 📤 Outputs

- **Result:** Interactive user responses captured via `$STDOUT`, styled ANSI text output, or status exit codes (`0` for success/affirmative, `1` for cancellation/rejection).
- **Side Effects:** Terminal stdout/stderr formatting; command execution during `gum spin`.

## ⛓️ Workflow

```bash
#!/usr/bin/env bash
set -euo pipefail

# 1. Interactive choice prompt
TARGET_ENV=$(gum choose "staging" "production")

# 2. Text input with placeholder
DEPLOY_NOTE=$(gum input --placeholder "Deployment reason...")

# 3. Confirmation prompt (exits 1 on No/Cancel)
gum confirm "Deploy to $TARGET_ENV?" || { echo "Aborted."; exit 0; }

# 4. Process execution with spinner
gum spin --spinner dot --title "Deploying to $TARGET_ENV..." -- sleep 3

# 5. Styled banner output
gum style --foreground 212 --border double --padding "1 2" "Deployment Complete!"
```

## 🧭 Reference map

| File | Load when |
| --- | --- |
| **This file** | always — mental model, core invariants, gotchas, cheat sheet |
| [prompts-and-inputs.md](prompts-and-inputs.md) | Building interactive prompts (`choose`, `confirm`, `filter`, `input`, `write`, `file`) |
| [styling-and-layout.md](styling-and-layout.md) | Styling text, borders, spinners, tables, layouts (`style`, `table`, `join`, `spin`, `format`, `log`) |

## 📋 Core invariants

1. **Stdout Capture vs. Interactive UI:** `gum` renders interactive UI elements to `stderr` / `/dev/tty` and outputs ONLY the final user selection to `stdout`. Capture selections directly via variable assignment: `SELECTED=$(gum choose "A" "B")`.
2. **Cancellation Exit Codes:** Rejection or cancellation (`Esc`, `Ctrl+C`, or choosing "No" in `confirm`) causes `gum` to exit with status code `1`. Under `set -e`, guard prompts with `|| true` or `if gum confirm ...; then`.
3. **Spinner Command Separator:** `gum spin` requires double hyphens `--` before the command to run: `gum spin --title "Building..." -- cargo build`.
4. **Environment Configuration:** All CLI flags map to environment variables prefixed with `GUM_<COMMAND>_<FLAG>` (e.g. `GUM_INPUT_PROMPT_FOREGROUND="212"`).

## ⚠️ Gotchas

- ❌ `gum confirm "Deploy?"` in a `set -e` script killing the process when user selects "No".
  - **Cause:** Selecting "No" causes `gum confirm` to return exit code `1`.
  - **Fix:** Guard with `if/else` or `||`: `gum confirm "Deploy?" || exit 0`.
- ❌ `gum spin --title "Running" make build` failing to parse the command arguments.
  - **Cause:** Missing `--` separator before the command.
  - **Fix:** Use `--`: `gum spin --title "Running" -- make build`.
- ❌ `cat list.txt | gum choose` failing with `error: stdin is not a tty`.
  - **Cause:** Piping stdin into `gum choose` redirects stdin away from the interactive terminal.
  - **Fix:** Use `gum filter` or `cat list.txt | gum choose < /dev/tty`.

## 📝 Cheat sheet

```bash
# Prompts
NAME=$(gum input --placeholder "Name")
SECRET=$(gum input --password)
COLOR=$(gum choose "Red" "Green" "Blue")
MULTI=$(gum choose --no-limit "A" "B" "C")
FILE=$(gum file /path/to/dir)
SEARCH=$(ls | gum filter --placeholder "Search files...")
gum confirm "Proceed?" || exit 0

# Styling & Layout
gum style --foreground 212 --border double "Alert"
gum style --foreground 99 --border rounded --padding "1 2" "Content"
gum join --horizontal "$(gum style 'Left')" "$(gum style 'Right')"
gum table --columns "ID,Name,Role" < data.csv
gum format --theme dark "# Markdown Heading"

# Execution & Logging
gum spin --spinner dot --title "Working..." -- sleep 5
gum log --level info "Server started on port 8080"
```

## Connections

- Uses [[justfile|Justfile Skill]] and [[nushell|Nushell Skill]] for interactive shell pipelines.

## 🔄 Provenance

- **Source:** `charmbracelet/gum@v0.16.0` official documentation and CLI flag surface.
- **Version:** v0.16.0.
- **Refresh:** Check `gum <command> --help` against newer CLI releases.
