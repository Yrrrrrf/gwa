# [[gum]] [[prompts-and-inputs]]

> [!abstract] Purpose
> Complete syntax, options, and behaviors for interactive input commands: `input`, `write`, `choose`, `confirm`, `filter`, and `file`.

## ⚡ Command Reference

### 1. `gum input` (Single-line Text Input)

| Flag | Type | Default | Purpose |
| --- | --- | --- | --- |
| `--placeholder` | string | `""` | Placeholder text when empty |
| `--prompt` | string | `"> "` | Prompt prefix string |
| `--value` | string | `""` | Initial pre-filled input value |
| `--password` | flag | `false` | Mask user keystrokes (`*`) for sensitive input |
| `--char-limit` | int | `400` | Maximum character length |
| `--width` | int | `0` | Field display width in columns |

```bash
# Basic text prompt
USERNAME=$(gum input --placeholder "username" --prompt "User: ")

# Password prompt
DB_PASS=$(gum input --password --placeholder "Enter database password")
```

---

### 2. `gum write` (Multi-line Text Editor)

| Flag | Type | Default | Purpose |
| --- | --- | --- | --- |
| `--placeholder` | string | `"Write something..."` | Placeholder text |
| `--prompt` | string | `"│ "` | Line prefix prompt |
| `--value` | string | `""` | Initial text content |
| `--width` | int | `50` | Editor width |
| `--height` | int | `5` | Editor height in lines |
| `--char-limit` | int | `400` | Maximum total characters |

```bash
# Capture multiline commit message (Ctrl+D or Esc to submit)
COMMIT_MSG=$(gum write --placeholder "Summary of changes..." --width 60 --height 8)
```

---

### 3. `gum choose` (List Selection)

| Flag | Type | Default | Purpose |
| --- | --- | --- | --- |
| `--limit` | int | `1` | Max selections allowed (`1` = single select) |
| `--no-limit` | flag | `false` | Allow unlimited multi-selection |
| `--selected` | string | `""` | Comma-separated list of initially selected items |
| `--cursor` | string | `"> "` | Selection cursor marker |
| `--header` | string | `""` | Header text above options |
| `--height` | int | `10` | Visible options window height |

```bash
# Single selection (returns selected item string)
ENV=$(gum choose "dev" "staging" "production")

# Multi-selection (returns newline-separated items)
SERVICES=$(gum choose --no-limit --selected "api,web" "api" "web" "worker" "db")
```

---

### 4. `gum confirm` (Yes/No Dialog)

| Flag | Type | Default | Purpose |
| --- | --- | --- | --- |
| `--affirmative` | string | `"Yes"` | Positive button text |
| `--negative` | string | `"No"` | Negative button text |
| `--default` | bool | `true` | Default selected option (`true` = Yes, `false` = No) |
| `--timeout` | duration | `0` | Timeout duration (e.g. `5s`) |

```bash
# Basic confirmation (exit code 0 = Yes, exit code 1 = No)
if gum confirm "Nuke database?"; then
  pnpm db:reset
fi

# Custom button labels & default to No
gum confirm --affirmative "Deploy" --negative "Cancel" --default=false "Proceed to deploy?" || exit 0
```

---

### 5. `gum filter` (Fuzzy Finder Search)

| Flag | Type | Default | Purpose |
| --- | --- | --- | --- |
| `--placeholder` | string | `"Filter..."` | Input search placeholder |
| `--indicator` | string | `"> "` | Selected item indicator |
| `--limit` | int | `1` | Max selections allowed |
| `--no-limit` | flag | `false` | Allow multi-selection |
| `--value` | string | `""` | Initial search query filter |

```bash
# Fuzzy search items from pipeline stdin
SELECTED_FILE=$(find . -maxdepth 2 -type f | gum filter --placeholder "Pick a file...")

# Multi-select fuzzy filter
BRANCH=$(git branch -a | gum filter --placeholder "Select branch...")
```

---

### 6. `gum file` (Interactive File Picker)

| Flag | Type | Default | Purpose |
| --- | --- | --- | --- |
| `--cursor` | string | `"> "` | File cursor marker |
| `--all` | flag | `false` | Show hidden files (`.dotfiles`) |
| `--file` | flag | `true` | Allow picking files |
| `--directory` | flag | `false` | Allow picking directories |
| `--height` | int | `10` | Visible directory list height |

```bash
# Pick a file starting from current directory
CONFIG_FILE=$(gum file .)

# Pick a directory only
TARGET_DIR=$(gum file --directory --all /var/log)
```

## 📋 Rules & Invariants

1. **Multi-Selection Format:** When `--no-limit` or `--limit > 1` is set on `gum choose` or `gum filter`, selected items are printed to `stdout` separated by newlines (`\n`).
2. **Keyboard Controls:** `j`/`k` or `Up`/`Down` move cursor; `Space` toggles selection in multi-select mode; `Enter` submits; `Esc` or `Ctrl+C` cancels (exit code `1`).
3. **Piping into `gum filter` vs `gum choose`:** `gum filter` natively reads candidates from `stdin` via pipes (`ls | gum filter`). `gum choose` accepts options as positional CLI arguments (`gum choose "A" "B"`).

## ⚠️ Gotchas & Fixes

- ❌ `cat options.txt | gum choose` producing blank choices or failing.
  - **Cause:** `gum choose` expects options as CLI arguments, not `stdin`.
  - **Fix:** Use `xargs` or `gum filter`: `cat options.txt | gum filter` or `gum choose $(cat options.txt)`.
- ❌ `gum confirm` hanging in headless CI/automated test environments.
  - **Cause:** No TTY available to accept keypresses.
  - **Fix:** Pass `--default` and non-interactive fallback: `[ -t 0 ] && gum confirm "Continue?" || true`.
