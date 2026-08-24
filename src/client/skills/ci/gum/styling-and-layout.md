# [[gum]] [[styling-and-layout]]

> [!abstract] Purpose
> Complete reference for terminal text formatting, borders, layout alignment, spinners, data tables, and structured logging.

## ⚡ Command Reference

### 1. `gum style` (Terminal Text Styling & Borders)

| Flag | Type / Values | Example | Purpose |
| --- | --- | --- | --- |
| `--foreground` | ANSI / 256 / Hex | `--foreground 212` or `--foreground "#FF5555"` | Text foreground color |
| `--background` | ANSI / 256 / Hex | `--background 57` or `--background "#000000"` | Text background color |
| `--border` | `none`, `normal`, `rounded`, `thick`, `double`, `hidden` | `--border rounded` | Surrounding box border style |
| `--border-foreground` | ANSI / Hex | `--border-foreground 212` | Border stroke color |
| `--padding` | string (CSS format) | `--padding "1 2"` | Top/Bottom Right/Left interior padding |
| `--margin` | string (CSS format) | `--margin "1 0"` | Exterior margin spacing |
| `--align` | `left`, `center`, `right` | `--align center` | Text alignment within width |
| `--width` | int | `--width 40` | Total box container width |
| `--bold` / `--italic` | flag | `--bold` | Font formatting modifiers |

```bash
# Styled box with rounded border and padding
gum style \
  --foreground 212 \
  --border-foreground 99 \
  --border rounded \
  --padding "1 2" \
  --margin 1 \
  "🚀 Application Deployed Successfully!"
```

---

### 2. `gum join` (Horizontal & Vertical Layout Alignment)

| Flag | Values | Default | Purpose |
| --- | --- | --- | --- |
| `--horizontal` | flag | `false` | Join input blocks side-by-side (left to right) |
| `--vertical` | flag | `true` | Join input blocks top to bottom |
| `--align` | `left`, `center`, `right`, `top`, `bottom` | `top`/`left` | Alignment across joined edges |

```bash
# Side-by-side dual styled boxes
BOX_A=$(gum style --border rounded --padding "0 1" "Status: OK")
BOX_B=$(gum style --border rounded --padding "0 1" "Port: 8080")

gum join --horizontal --align top "$BOX_A" " " "$BOX_B"
```

---

### 3. `gum spin` (Command Execution Spinner)

| Flag | Values / Type | Default | Purpose |
| --- | --- | --- | --- |
| `--spinner` | `line`, `dot`, `minidot`, `jump`, `pulse`, `points`, `globe`, `moon`, `monkey` | `dot` | Animated spinner glyph style |
| `--spinner.foreground` | ANSI / Hex | `212` | Spinner animation color |
| `--title` | string | `"Loading..."` | Text title next to spinner |
| `--show-output` | flag | `false` | Display command stdout while running |

```bash
# Run command behind animated spinner (must use '--' before command)
gum spin --spinner globe --title "Fetching dependencies..." -- pnpm install

# Show command stdout during spinner
gum spin --title "Running test suite..." --show-output -- cargo test
```

---

### 4. `gum table` (Data Table Display)

| Flag | Type | Default | Purpose |
| --- | --- | --- | --- |
| `--columns` | string | `""` | Comma-separated column headers |
| `--widths` | string | `""` | Comma-separated column character widths |
| `--height` | int | `10` | Visible table height |
| `--separator` | string | `,` | Input data delimiter (e.g. `,` for CSV, `\t` for TSV) |

```bash
# Render interactive tabular data from CSV stdin
cat << EOF | gum table --columns "ID,Service,Status" --widths "5,15,10"
1,Database,Running
2,Redis,Running
3,API Gateway,Stopped
EOF
```

---

### 5. `gum format` & `gum log` & `gum pager`

```bash
# Render styled Markdown directly in terminal
gum format --theme dark "# Header 1\n* Item 1\n* Item 2"

# Structured leveled terminal logging
gum log --level info "Server booting..."
gum log --level warn --struct "Memory high" threshold 90
gum log --level error "Connection failed" host "db.local"

# View long outputs with scrollable pager (q to quit)
git log --oneline | gum pager
```

## 📋 Rules & Invariants

1. **CSS Padding/Margin Syntax:** Padding and margin flags accept CSS 1-to-4 value syntax: `"1"` (all), `"1 2"` (top/bottom, left/right), `"1 2 3 4"` (top, right, bottom, left).
2. **Spinner Command Execution:** Commands executed inside `gum spin -- <cmd>` inherit standard environment variables; exit code of `gum spin` matches the exit code of the inner command.
3. **Color Formatting:** Supports 4-bit ANSI (`red`, `green`, `blue`), 8-bit ANSI numbers (`0`-`255`), and 24-bit TrueColor Hex codes (`#RRGGBB`).

## ⚠️ Gotchas & Fixes

- ❌ `gum spin --title "Building" pnpm build` failing to execute command.
  - **Cause:** Omitted the mandatory `--` separator before the command string.
  - **Fix:** Add `--`: `gum spin --title "Building" -- pnpm build`.
- ❌ Joined boxes with `gum join --horizontal` appearing misaligned vertically.
  - **Cause:** Default alignment or mismatched heights between box strings.
  - **Fix:** Specify `--align top` or `--align center`: `gum join --horizontal --align top "$A" "$B"`.
