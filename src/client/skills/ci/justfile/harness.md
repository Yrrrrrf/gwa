# [[just]] — modules & the house harness

> [!abstract] Purpose
> How a `justfile` is structured across files, and the four-phase house build harness that drops into any repo unchanged: `import` vs `mod`, the 4-phase layered layout (4 files + shared: `dev`, `test`, `check`, `deploy` + `_shared`), the fixed verbs whose *tools* swap per language while the *verb* stays constant, the convergence pipeline where `ci` is the meeting point of `check` and `test`, interactive menu autocomplete via `gum`, and the nushell pairing that makes recipe bodies pipelines instead of shell scripts.

## 📥 Inputs

- **Context:** a repo getting its first `justfile`, or one whose root justfile has grown past roughly 60 lines and needs splitting across logical phases.
- **Constraints:** `set shell := ["nu", "-c"]` in the root. Tools are assumed installed (`uv`, `ruff`, `ty`, `cargo`, `bacon`, `deno`, `biome`, `alejandra`, `statix`, `deadnix`, `nh`, `fd`, `rg`, `gum`) — recipes never probe for them or fall back to legacy equivalents. CI calls `just ci` and does not re-implement the pipeline.
- **Anti-use:** don't build the full 4-phase harness for a repo with four recipes — a single `justfile` is correct until the layers earn themselves. Don't use `mod` when you wanted `import`; see the comparison table below. And don't reach for this file to learn core recipe syntax — that's [SKILL.md](SKILL.md).

## 📤 Outputs

- **Result:** Four phases, not six files. `dev`, `test`, `check`, and `deploy` are the only phase verbs a human types by name — everything else hangs underneath them. `ci` is the convergence of `check` and `test`. `just` prints a grouped menu, `just menu` gives interactive fuzzy autocomplete, and switching tools (e.g. `ruff` for `biome`) is a one-line change that every higher verb inherits.
- **Side effects:** the `check` family **rewrites the working tree** (`fmt`, `--fix`). The `test` family only reads. `deploy` ships (only on a green CI). `dev` (`prune`/`prepare`) deletes caches and lockfiles.

## ⛓️ Workflow

```just
# justfile (root) — settings live here; `import` shares this scope with every layer
set shell := ["nu", "-c"]
set unstable                  # only if a layer needs lists / cache / user functions

import '_shared.just'
import 'dev.just'
import 'test.just'
import 'check.just'
import 'deploy.just'
```

## 🧭 Layout

```text
justfile          root · set shell · imports 4 layer files + shared, nothing else
├── _shared.just  FRONT DOOR · vars (PROJECT/VERSION), `list` [default], `menu` (gum), _banner, _helpers
├── dev.just      LOOP       · prune · prepare · run <T>                     (human, tight loop)
├── test.just     PROVE      · test · test <T> · coverage                    (reads only)
├── check.just    FIX·WRITES · fmt · lint · types · (audit) · check          (rewrites tree)
└── deploy.just   SHIP       · ci(check+test) · build · publish · (preview)  (releases green tree)
```

Split **by audience and phase, not by topic**: the question each file answers is *who runs this, and when*.

```text
Four phases, not six files. dev, test, check, and deploy are the only recipes
a human ever types by name — everything else hangs underneath them.
ci isn't a phase at all; it's what falls out when check and test meet.
And every recipe here is reachable the same way, through one front door: _shared.just.
```

## 📋 Core invariants

1. **The verb is constant; the tool swaps.** `fmt`, `test`, `prepare`, or `build` means the same thing in every repo. A consumer learns the verbs and never the tools underneath.
2. **Four phases, not six files.** `dev.just`, `test.just`, `check.just`, `deploy.just`, unified by `_shared.just`. `ci.just` is eliminated.
3. **`ci` is convergence, not a separate phase.** `ci` has no dedicated file; it is the meeting point of `check` (code quality) and `test` (behavior). `ci: check test` gates all deployment.
4. **A higher verb *calls* a lower one — it never re-lists steps.** `check: fmt lint types`, `ci: check test`, `publish: ci deploy`. Change `fmt` once and every verb above inherits it.
5. **`check` writes; `test` reads.** `check` is the "make it right" button (in-place fixers), not a report. Form-correctness and behavior-correctness fail for different reasons and must stay independent.
6. **Exactly three checks in the default umbrella** — `fmt`, `lint`, `types`. `check` is their umbrella, not a fourth thing. `audit` is the optional fourth (slower, network-bound) and stays out of the default `check`.
7. **Two front doors: `list` & `menu`.** `list` is `[default]` in `_shared.just` so bare `just` prints the grouped menu; `menu` provides interactive fuzzy filtering over all public recipes via `gum`.
8. **Public verbs are flat; helpers wear a leading `_` and `[private]`**, and live in `_shared.just`.
9. **This harness uses `import`, not `mod`** — one flat surface of verbs across 4 phase files + shared, sharing the root's settings and variables.
10. **CI runs `just ci`.** The justfile is the source of truth; the CI workflow YAML is a two-line shim.

## ⚠️ Gotchas

```just
# ❌ same recipe name in two imported layers
# check.just: test: …    test.just: test: …
# error: recipe `test` first defined on line 1 is redefined on line 1
# ✅ either rename, or opt in deliberately
set allow-duplicate-recipes     # last definition wins
```
**Cause:** `import` merges into one flat scope, so names collide across layers. **Fix:** keep verbs unique across layers, and reserve `allow-duplicate-recipes` for intentional overrides of a shared base.

```just
# ❌ set shell in an imported layer
# check.just
set shell := ["nu", "-c"]
# error: setting `shell` first set on line 1 is redefined on line 1
# ✅ settings live once, in the root justfile — `import` shares that scope
```

```just
# ❌ expecting a mod submodule to see root variables
mod deploy
# deploy.just referencing {{PROJECT}} → error: variable `PROJECT` not defined
# ✅ `mod` is isolated. Use `import` for shared scope, or redefine locally.
```
**Cause:** `mod` gives each submodule its own settings, variables, and namespace. **Fix:** `import` for layers of one logical justfile; `mod` only for genuinely independent sub-projects.

```just
# ❌ a default recipe that takes parameters
[default]
build target:
    cargo build --profile {{target}}
# bare `just` now fails asking for an argument
# ✅ keep the default parameter-less
[default]
list:
    @just --list --unsorted
```

```just
# ❌ multi-statement nushell across plain recipe lines
report:
    let files = (fd -e rs | lines)
    print $"($files | length) files"
# each line is a separate `nu -c`, so `files` is gone by line 2
# ✅ one process via shebang
report:
    #!/usr/bin/env nu
    let files = (fd -e rs | lines)
    print $"($files | length) files"
```
**Cause:** `set shell := ["nu","-c"]` runs one interpreter per line. **Fix:** shebang `#!/usr/bin/env nu` or `[script('nu')]`. Note that a shebang body **ignores `set shell`** and uses its own interpreter.

- **`fd` without `-u` finds nothing** when targets are gitignored — `fd` respects `.gitignore` by default, and build artifacts / caches you want to purge are gitignored.
- **`--prune` stops descent into matches**, so `node_modules/.vite` dies with its parent instead of being listed and double-deleted.
- **`gum` missing**: `menu` and `_banner` rely on `gum` (`charmbracelet/gum`). If `gum` is absent, bare `just` / `just list` remains fully functional.

## 📝 Cheat sheet

```just
import '_shared.just'      import? 'optional.just'      # FLAT: shared scope
mod sub                    mod docs 'tools/docs.just'   mod? extra   # NESTED: own scope

[default] [group('meta')] list:   @just --list --unsorted
[group('meta')] menu:             # interactive autocomplete fuzzy filter (nu + gum)
[private] _banner msg:            # styled notification banner (nu + gum)

# The convergence ladder
check: fmt lint types      ci: check test      publish: ci build
prune:                     # nuke caches & lockfiles
    fd -u --prune '^(node_modules|\.venv|target|\.svelte-kit)$' | lines | each {|p| rm -rf $p }
prepare: prune             # reinstall and resync
run target:                # execute a target in the dev loop
```

---

## 1. `import` vs `mod`

```just
import '_shared.just'        # FLAT — copies items into this file's scope
import? 'optional.just'      # `?` — fine if the file is missing

mod sub                      # SUBMODULE — searches sub.just, sub/mod.just, sub/justfile
mod docs 'tools/docs.just'   # explicit path; a leading ~/ expands to $HOME
mod? extra                   # optional submodule
```

| Property | `import` | `mod` |
|---|---|---|
| **Namespace** | flat, merged in | nested — `sub::recipe` or `just sub recipe` |
| **Scope** | shares the root's variables and settings | isolated; its own settings and variables |
| **Working directory** | root justfile directory | the submodule's directory (unless `[no-cd]`) |
| **Duplicate names** | error unless `set allow-duplicate-recipes` | impossible — different namespaces |
| **Use for** | composing one logical justfile from layers | genuinely independent sub-projects |
| **Stability** | stable | stable since **1.31** (no `set unstable` needed) |

Environment files load per module, honoring that module's settings; parent-module environment variables are visible in children. A module's `[default]` recipe runs on `just sub`.

---

## 2. The four phases — fixed vocabulary, swapped tools

```text
dev (loop)   ──▶  test (prove)  ──┐
                  check (fix)   ──┴──▶  ci  ──▶  deploy (publish)
```

| Verb | Phase | Python | Rust | Nix | Web (Deno / Biome) | Nushell |
|---|---|---|---|---|---|---|
| `prune` | **dev** | `rm -rf .venv __pycache__` | `cargo clean` | `nh clean all` | `rm -rf node_modules .vite` | — |
| `prepare` | **dev** | `uv sync` | `cargo fetch` | `nix flake update` | `deno install` | — |
| `run <T>` | **dev** | `uv run <T>` | `cargo run --bin <T>` | `nix run .#<T>` | `deno run -A <T>` | `nu <T>` |
| `test` | **test** | `uv run pytest` | `cargo test` | `nix flake check` | `deno test` | `nu tests/…` |
| `test <T>` | **test** | `uv run pytest -k <T>` | `cargo test <T>` | `nix run .#test-<T>` | `deno test <T>` | `nu tests/<T>.nu` |
| `coverage` | **test** | `uv run pytest --cov` | `cargo llvm-cov` | — | `deno test --coverage` | — |
| `fmt` | **check** | `ruff format .` | `cargo fmt` | `alejandra .` | `biome format --write` | `nufmt --stdin` |
| `lint` | **check** | `ruff check --fix .` | `cargo clippy --fix` | `statix check` + `deadnix` | `biome lint --write` | — |
| `types` | **check** | `ty check` | `cargo check` | `nix flake check` | `deno check` | — |
| `audit` *(opt)* | **check** | `uv audit` | `cargo audit` | `flake-checker --no-telemetry` | `deno audit` | — |
| `build` | **deploy** | `uv build` | `cargo build --release` | `nix build` | `deno compile` / `biome ...` | — |
| `publish` | **deploy** | `uv publish` | `cargo publish` | `nix flake publish` / deploy | `deno publish` / `npm publish` | — |
| `preview` *(opt)*| **deploy** | deploy ephemeral staging | deploy preview artifact | build ephemeral NixOS VM | deploy PR preview URL | — |

---

## 3. The pipeline convergence

```text
    dev                 test                check               deploy
  [prune]              [test]               [fmt]               [build]
 [prepare]           [test <T>]            [lint]              [publish]
 [run <T>]           [coverage]           [types]              [preview]
     │                   │                   │                     ▲
  (loop)                 │                (audit)                  │
                         └─────────┬─────────┘                     │
                                   ▼                               │
                                [check]                            │
                                   │                               │
                                   ▼                               │
                                 [ci] ─────────────────────────────┘
                            (check + test)                   (ci + deploy)
```

The composition ladder shows how recipes build strictly on lower primitives without re-listing execution steps:

```text
check   = fmt + lint + types        # the umbrella, not a fourth verb
ci      = check + test              # not a phase — what the phases add up to
publish = ci + release + deploy     # only ships a green tree
```

- **`dev`** is the human loop (`prune` → `prepare` → `run <T>`). It is tight, interactive, and never runs in CI.
- **`test`** proves behavior and only reads (`test`, `test <T>`, `coverage`).
- **`check`** fixes and verifies form in place (`fmt`, `lint`, `types`).
- **`ci`** is the convergence node: `check` + `test`. This is the one automated gate a PR must pass.
- **`publish`** depends on `ci` passing green before executing release and build artifacts.

---

## 4. Complete reference harness

### Root: `justfile`

```just
# justfile (root) — settings live here; `import` shares this scope with every layer
set shell := ["nu", "-c"]
set unstable                  # only if a layer needs lists / cache / user functions

import '_shared.just'
import 'dev.just'
import 'test.just'
import 'check.just'
import 'deploy.just'
```

### Front door & base: `_shared.just`

```just
# _shared.just — vars, private helpers, and the front door. Shared into every
# layer via `import`; settings and variables live here once.

PROJECT := "poly-core"
VERSION := `git describe --tags --always --dirty`

[default]
[group('meta')]
list:
    @just --list --unsorted

# Interactive autocomplete over every public recipe — type to fuzzy-filter.
[group('meta')]
menu:
    #!/usr/bin/env nu
    let recipes = (just --summary | str trim | split row ' ')
    let choice = ($recipes | str join "\n" | ^gum filter --placeholder ($"($PROJECT) recipe...")) | str trim
    if ($choice | is-not-empty) { just $choice }

[private]
[group('meta')]
_banner msg:
    #!/usr/bin/env nu
    ^gum style --foreground 212 --border rounded --padding "0 2" "{{msg}}"

[private]
[group('meta')]
_clean-tree:
    #!/usr/bin/env nu
    if (git status --porcelain | is-not-empty) { error make {msg: "working tree dirty"} }
```

### Dev phase: `dev.just`

```just
# dev.just — loop · human, tight

[group('dev')]
prune:
    #!/usr/bin/env nu
    fd -u --prune '^(node_modules|\.venv|target|\.svelte-kit|\.vite|deno\.lock)$' | lines | each {|p| rm -rf $p }

[group('dev')]
prepare: prune
    #!/usr/bin/env nu
    # Reinstall and resync
    print "syncing dependencies..."

[group('dev')]
run target="":
    #!/usr/bin/env nu
    if ($target | is-empty) {
        print "running default target..."
    } else {
        print $"running target: ($target)"
    }
```

### Test phase: `test.just`

```just
# test.just — prove · reads only

[group('test')]
test:
    cargo test

[group('test')]
test-target target:
    cargo test {{target}}

[group('test')]
coverage:
    cargo llvm-cov
```

### Check phase: `check.just`

```just
# check.just — fix · writes (rewrites working tree in place)

[group('check')]
fmt:
    cargo fmt

[group('check')]
lint:
    cargo clippy --fix --allow-dirty --allow-staged

[group('check')]
types:
    cargo check

[group('check')]
audit:
    cargo audit

[group('check')]
check: fmt lint types          # the umbrella, not a fourth verb
```

### Deploy phase: `deploy.just`

```just
# deploy.just — ship

[group('ci')]
ci: check test                 # convergence: check + test (the one thing a PR must pass)

[group('deploy')]
build:
    cargo build --release

[group('deploy')]
preview:
    @print "preview: deploying ephemeral staging environment..."

[group('deploy')]
[confirm("ship release to production?")]
publish: ci build              # only ships a green tree
    _banner "shipping {{PROJECT}} {{VERSION}}"
    @print "published {{PROJECT}} {{VERSION}}"
```

---

## 5. `prepare` & `prune` — the dev loop

The dev loop separates tearing down corrupted state from rebuilding clean state:

```just
# nuke caches and lockfiles
prune:
    fd -u --prune '^(node_modules|\.svelte-kit|\.vite|deno\.lock|\.venv|target)$' | lines | each {|p| rm -rf $p }

# rebuild fresh state
prepare: prune
    deno install
    cd apps/vision; deno run -A npm:svelte-kit sync
```

- **`fd -u` is load-bearing:** Every target cache or lockfile is typically in `.gitignore`, and `fd` respects `.gitignore` by default. Without `-u` (`--unrestricted`), `fd` finds nothing.
- **`--prune` stops recursive descent:** When a matched directory like `node_modules` is matched, `--prune` prevents descending into its contents, avoiding redundant child scans and double deletions.

---

## 6. Front door & interactive UX

Bare `just` and `just menu` give developers two distinct entry experiences:

```text
~/poly-core ❯ just menu
┌──────────────────────────────────────┐
│ poly-core recipe... tes▏             │
└──────────────────────────────────────┘
  fmt
  lint
> test — full suite
  test-target

~/poly-core ❯ just test
✓ 41 passed in 0.7s
```

- **`list` (`[default]`)**: Fast, non-interactive grouped listing via `@just --list --unsorted`.
- **`menu`**: Uses `just --summary` piped into `^gum filter` for interactive fuzzy-search across recipe names.
- **`_banner`**: Emits consistent, Catppuccin-styled rounded badges via `^gum style` for release steps and notifications.

---

## 7. Nushell pairing & pipelines

With `set shell := ["nu", "-c"]`, single-line recipes execute as individual `nu -c '<line>'` commands. Multi-statement logic should always be wrapped in a shebang block (`#!/usr/bin/env nu`) to execute in a single process:

```just
# single pipeline: natural and concise
stale:
    ls **/*.rs | where modified < ((date now) - 30day) | get name | print

# multi-statement: single process via shebang
audit-sizes:
    #!/usr/bin/env nu
    let big = (ls **/* | where size > 10mb)
    if ($big | is-empty) {
        print "clean"
    } else {
        $big | select name size | print
    }
```

Reach for structured data commands (`open | where | each | select`) instead of loops. Use `error make {msg: "…"}` to fail a recipe with an explicit error message and abort subsequent dependencies.

---

## Connections

- Parent: [[just]] [[skill]] — [SKILL.md](SKILL.md)
- Reference visualization: [harness-pipeline.html](harness-pipeline.html)
- Attributes used here (`[private]`, `[group]`, `[default]`, `[confirm]`): [attributes-settings.md](attributes-settings.md)
- Pairs with [[nushell]] and `gum` for interactive command pipelines.

---

## 🔄 Provenance

`import` / `mod` semantics transcribed from the upstream Programmer's Manual at just **1.57.0**, verified 2026-07-28; `mod` invocation and dependency deduplication were reproduced against a local 1.57.0 binary.

The four-phase harness (`dev.just`, `test.just`, `check.just`, `deploy.just` + `_shared.just`), the `ci` convergence model, the `gum` menu integration, and the per-language tool matrix are **house conventions, not upstream `just`** — designed for clean separation of concerns and maximum consistency across multi-language repositories.

To refresh: re-check the `import` / `mod` comparison table against the upstream manual, and update the tool matrix when repository toolchains evolve.
