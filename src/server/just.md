---
name: just
description: >-
  Authoritative `just` command-runner reference (just 1.x, current 1.54+) plus this repo's five-verb build harness. Dense, code-first manual for recipes and dependencies (`&&` subsequent deps, dependency arguments), line sigils (`@`/`-`), positional/variadic/`$`-exported parameters, `:=` assignments, backticks, conditionals and operators (`==`/`!=`/`=~`), string literals, `export`/dotenv/`set` settings, the full recipe-attribute set (`[private]`/`[group]`/`[doc]`/`[confirm]`/`[no-cd]`/`[positional-arguments]`/`[parallel]`/`[working-directory]`/`[script]`/OS gates), built-in functions, shebang & script recipes, and `import`/`mod` modules. Pairs with nushell via `set shell := ["nu", "-c"]`. Reach for this when writing or editing a `justfile`, structuring the dev/check/test/ci/deploy layers, or composing verbs. Also use for errors like "Found a mix of tabs and spaces", `=` vs `:=` parse failures, recipe args splitting on spaces, "just has no flags", lost shell variables between recipe lines, or `set shell` being ignored by a shebang recipe.
---
# [[000-Zettelkasten/just|just]] [[skill]]

> [!abstract] Purpose
> Authoritative, code-first `just` reference + the house build harness. The full recipe/attribute/function surface (simple → strange), the traps that produce parse errors or wrong output, and the five-verb layered skeleton (`dev`/`check`/`test`/`ci`/`deploy`) that drops into every repo unchanged.

## 📥 Inputs
- **Context:** `justfile` / `server.just`, `scripts/_shared.just`, layer files (`scripts/dev.just`/`scripts/check.just`/`scripts/test.just`/`scripts/ci.just`/`scripts/deploy.just`), CI workflows that call `just ci`.
- **Constraints:** Runner is `just`, shell is `nushell` (`set shell := ["nu", "-c"]`). Not `make`, not bash. Tools are assumed present — recipes never check for or fall back from them.

## 📤 Outputs
- **Result:** A portable harness where the *verbs* are fixed and only the tool inside each recipe changes per language.
- **Side Effects:** `check`-family rewrites the tree (`fmt`, `--fix`); `test`-family only reads; `deploy`-family ships.

## ⛓️ Workflow
When writing a recipe, answer in order: **(1)** which layer? (who runs it, when) → that's the file. **(2)** write or read? declare it. **(3)** can it *call* an existing verb instead of re-listing steps? compose up. **(4)** is it a pipeline? reach for `open | where | each` before a loop. **(5)** private? leading `_` + `[private]` in `scripts/_shared.just`. **(6)** discoverable from bare `just`? if not, it isn't done.

## 📋 Reference
### The five verbs (fixed) — tools (swapped)
`fmt`/`lint`/`types`/`test`/`check`/`ci`/`deploy` mean the same thing in every repo. Only one line inside each recipe changes per language. The consumer learns the **verb**, never the tool. Composition: `check = fmt+lint+types`, `ci = check+test`, `commit = ci + git`, `publish = ci + release + deploy`.

---

## 1. Mental model (the category-error vaccine)

- **Command runner, not a build system.** No `.PHONY`, no implicit rules, no file-timestamp dependency graph. Recipes are named task verbs.
- **Not `make`, not bash.** No tab-significant *rules* (but bodies still need consistent indentation), no `$()`. New recipe logic is nushell pipelines.
- **`:=` assigns, `=` does not.** Variables: `x := "v"`. Recipe *parameters* use `=` for defaults (`build mode="debug":`). Mixing them is the #1 parse error.
- **Each recipe line is a fresh shell.** Shell variables do **not** survive to the next line. For multi-statement state, use a shebang/`[script]` recipe.
- **Two namespaces in a body.** `{{x}}` is *just* interpolation (resolved by just, parse-time-ish). `$x` is *shell/nu* (resolved by the shell at runtime). They are not interchangeable.
- **Errors resolve statically.** Unknown recipes and circular deps are reported before anything runs.
- **just has no flags.** Recipe parameters are positional. `build --release:` does not create a `--release` flag (see §4).

---

## 2. Recipes & dependencies

```just
build:                      # recipe name, then indented body
    cc main.c -o main

test: build                 # `build` is a PRIOR dependency → runs first
    ./test

deploy: build && notify cleanup   # `&&` = SUBSEQUENT deps → run AFTER body
    ./ship

default: (build "release")  # dependency WITH arguments → parenthesize
build target="debug":
    cargo build --profile {{target}}
```

- Dependencies always run **first** and **once** (deduplicated), even if passed after their dependents on the CLI.
- Recipes named on the CLI run left-to-right: `just build test`.
- A line failing aborts the recipe (set `-` to ignore — §3).
- `alias b := build` — CLI alias. `[default]` attribute or the first recipe runs on bare `just`.

---

## 3. Line sigils (recipe-body prefixes)

| Prefix | Effect |
|---|---|
| `@cmd` | don't echo the line before running it |
| `-cmd` | ignore a non-zero exit; keep going |
| `@-cmd` / `-@cmd` | both: quiet **and** error-tolerant |
| `@recipe:` | quiet the whole recipe (prefix on the name line) |

```just
clean:
    -rm -rf dist        # ok if dist doesn't exist
    @echo "cleaned"     # runs silently
```

Globals: `set quiet` silences all echoing; `[no-quiet]` overrides it per recipe.

---

## 4. Recipe parameters

```just
greet name greeting="hi":          # positional; `greeting` has a default
    @echo "{{greeting}}, {{name}}"

backup +files:                     # `+` variadic: ONE or more → space-joined
    tar czf backup.tgz {{files}}

test *args:                        # `*` variadic: ZERO or more
    cargo test {{args}}

run $PORT="8080":                  # `$` EXPORTS the param as an env var ($PORT in shell)
    ./server                       # reads $PORT from the environment
```

- **No flags.** Emulate them with positional defaults + a conditional:
  ```just
  build mode="debug":
      cargo build {{ if mode == "release" { "--release" } else { "" } }}
  # just build release
  ```
- Quote interpolations that may contain spaces: `lynx "{{QUERY}}"` — unquoted `{{QUERY}}` splits into multiple args.
- `[arg(...)]` attributes (1.45+) add option/pattern behavior: `[arg('n', pattern='\d+')]`, `[arg(ARG, long="LONG")]`, `[arg(ARG, value=VALUE)]` (flag without value).

---

## 5. Variables, expressions, conditionals

```just
name    := "demo"
version := `git describe --tags --always`     # backtick = shell stdout, captured
full    := name + "-" + version               # `+` concatenates strings
path    := justfile_directory() / "dist"      # `/` joins paths (always forward-slash)

profile := if version =~ '-dirty$' { "debug" } else { "release" }   # ternary expr
```

Operators in expressions: `==`, `!=`, `=~` (regex match), `&&`, `||`, `+` (concat), `/` (path join). Conditionals are `if C { A } else { B }` and may chain `else if`.

---

## 6. String literals & interpolation

| Form | Behavior |
|---|---|
| `'single'` | raw — no escapes |
| `"double"` | C-style escapes (`\n`, `\t`, `\"`) |
| `'''triple single'''` | raw, multiline; leading newline stripped |
| `"""triple double"""` | escaped, multiline |
| `{{ expr }}` | interpolation in bodies, assignments, defaults |
| `\` (end of line) | line continuation in recipe bodies |

```just
msg := "line1\nline2"
banner := '''
  raw multiline
  no escapes here
'''
```

---

## 7. Environment & dotenv

```just
export DATABASE_URL := "postgres://…"   # `export` → real env var ($DATABASE_URL in shell)
set export                              # export ALL just vars as env vars

set dotenv-load                         # load .env into the environment
set dotenv-filename := ".env.local"
set dotenv-required                     # error if the dotenv file is missing

serve:
    ./app --url $DATABASE_URL           # $… because it's exported; {{…}} would NOT be in env
```

- Plain `x := …` is a *just* var — reach it with `{{x}}`, **not** `$x`. Only `export`ed vars (or `$`-params, or dotenv vars) live in the shell env.
- `env('KEY')` / `env('KEY', 'default')` read env vars inside expressions.

---

## 8. Settings (`set NAME` / `set NAME := VALUE`)

| Setting | Type | Purpose |
|---|---|---|
| `shell` | list | command for recipe lines + backticks. **`set shell := ["nu", "-c"]`** |
| `windows-shell` | list | per-OS shell override |
| `export` | bool | export all vars as env |
| `dotenv-load` / `-filename` / `-path` / `-required` / `-override` / `-command` | mixed | `.env` loading |
| `positional-arguments` | bool | expose `$1 $2 $@` to recipe bodies |
| `fallback` | bool | search parent-dir justfiles for unknown recipes |
| `quiet` | bool | suppress all command echoing |
| `ignore-comments` | bool | don't echo `#` lines in bodies |
| `allow-duplicate-recipes` / `-variables` | bool | last definition wins (used with `import`) |
| `working-directory` | string | base dir for recipes (1.33) |
| `script-interpreter` | list | interpreter for bare `[script]` recipes |
| `tempdir` | string | where shebang/script bodies are written |
| `unstable` | bool | enable unstable features (`mod`, `which`, `[cache]`) |

Settings live in the root `justfile`. Because `import` shares the root's scope, `set shell` propagates to every imported layer.

---

## 9. Attributes (annotate recipes / `mod` / aliases)

Stack on lines above the recipe, or comma-separate: `[no-cd, private]`.

| Attribute | Use |
|---|---|
| `[private]` | hide from `--list`; for helpers (leading `_` also hides) |
| `[group('NAME')]` | bucket recipes in `--list` output |
| `[doc('TEXT')]` / `[doc]` | set/suppress the `--list` doc string |
| `[default]` | run on bare `just` / module default |
| `[confirm]` / `[confirm("PROMPT")]` | require y/N before running (`--yes` bypasses) |
| `[no-cd]` | don't chdir to the justfile dir — operate on the invocation dir |
| `[working-directory('PATH')]` | run the recipe from `PATH` |
| `[positional-arguments]` | give this recipe `$1 $2 $@` |
| `[parallel]` | run this recipe's dependencies in parallel (1.42) |
| `[no-exit-message]` / `[exit-message]` | hide/force the failure message |
| `[env(NAME, VALUE)]` | set an env var for the recipe (1.47) |
| `[script]` / `[script('CMD')]` | run the body as one script via `CMD` (§12) |
| `[extension('.ext')]` | file extension for the shebang/script temp file |
| `[unix]`/`[linux]`/`[macos]`/`[windows]` | enable only on that OS |
| `[metadata(...)]` | attach strings, read via `--dump --dump-format json` |

```just
[private]
[group('check')]
_rewrite path:
    ruff format {{path}}
```

---

## 10. Built-in functions (call inside `{{ }}`, assignments, defaults)

| Group | Functions |
|---|---|
| System | `arch()`, `os()`, `os_family()`, `num_cpus()` |
| Shell out | `shell('cmd $1', arg)` — stdout of a shell command with args |
| Env | `env('KEY')`, `env('KEY', 'default')` |
| Executables | `require('bash')` (path or error), `which('x')` (path or empty; needs `set lists`) |
| Invocation | `invocation_directory()`, `is_dependency()`, `recipe_name()` |
| Paths (just dirs) | `justfile()`, `justfile_directory()`, `source_directory()`, `module_directory()`, `module_path()` |
| Path ops | `join(a, b)` (prefer the `/` operator), `clean(p)`, `absolute_path(p)`, `canonicalize(p)`, `extension(p)`, `file_name(p)`, `file_stem(p)`, `parent_directory(p)`, `without_extension(p)` |
| Filesystem | `path_exists(p)`, `read(p)` |
| Strings | `replace(s,from,to)`, `replace_regex(s,re,rep)`, `trim(s)`, `trim_start/end(_match[es])`, `quote(s)`, `append(suf,s)`, `prepend(pre,s)`, `uppercase`/`lowercase`, `encode_uri_component` |
| Case | `kebabcase`, `snakecase`, `shoutysnakecase`, `titlecase`, `lowercamelcase`, `uppercamelcase`, `capitalize` |
| Assert/error | `assert(COND, "msg")`, `error("msg")` |
| Hash/id | `sha256(s)`, `sha256_file(p)`, `blake3(s)`, `uuid()`, `choose(n, HEX)` |
| Time/semver | `datetime("%F")`, `datetime_utc(...)`, `semver_matches("1.2.0", ">=1.0")` |
| User dirs | `home_directory()`, `config_directory()`, `cache_directory()`, `data_directory()` (… `_dir` abbreviations allowed) |

```just
proj    := file_stem(justfile())
release := if semver_matches(version, ">=1.0.0") == "true" { "stable" } else { "pre" }
```

---

## 11. Constants

`HEX` / `HEXLOWER` / `HEXUPPER` (1.27). ANSI display constants (1.37): `BLACK RED GREEN YELLOW BLUE MAGENTA CYAN WHITE` (+ `BG_*` / bright), styles `BOLD ITALIC UNDERLINE DIM INVERT STRIKETHROUGH`, reset `NORMAL`.

```just
ok:
    @echo "{{GREEN}}✓ passed{{NORMAL}}"
```

---

## 12. Shebang & script recipes (multi-line state)

A body whose first line is a `#!` shebang runs as **one** script (shared process — variables persist across lines). `[script]`/`[script('CMD')]` does the same without a shebang.

```just
# shebang: the whole body is one nu process
report:
    #!/usr/bin/env nu
    let files = (fd -e rs | lines)
    print $"($files | length) rust files"

# [script] form, interpreter from set script-interpreter
[script('nu')]
summary:
    ls **/*.nu | length | print
```

**Shebang recipes ignore `set shell`** — they use their own interpreter. With `set shell := ["nu","-c"]`, a plain recipe runs each line as `nu -c '<line>'`; for multi-statement nu, use a shebang/`[script('nu')]` recipe or fold it into one pipeline.

---

## 13. Modules & imports

```just
import 'scripts/_shared.just'         # FLAT: copies recipes into this file's scope (shared vars/settings)
import? 'optional.just'       # `?` = ok if missing

mod sub                       # SUBMODULE: loads sub.just / sub/justfile, own scope
mod docs 'tools/docs.just'    # custom path
mod? extra                    # optional submodule
# call: `just sub::build` or `just sub build`
```

| | `import` | `mod` |
|---|---|---|
| Namespace | flat (merged in) | nested (`sub::recipe`) |
| Scope | shares root vars/settings | isolated; own settings |
| Use for | composing one logical justfile from layers | independent sub-projects |

This harness uses **`import`** — one flat surface of verbs across the six files.

---

## 14. Command-line usage

```text
just                     run the default / first recipe (here: `list`)
just RECIPE a b          run with positional args
just R1 R2               chain recipes
just --list (-l)         menu; --unsorted keeps file order
just --choose            fuzzy-pick a recipe (skim/fzf)
just --show RECIPE (-s)  print a recipe's source
just --summary           one-line list of recipe names
just --evaluate [VAR]    print all vars / one var's value
just --variables         list variable names
just --dump [--dump-format json]   normalized / machine-readable dump
just --set VAR val R     override a variable for this run
VAR=val just R           override via environment
just --yes R             auto-confirm [confirm] recipes
just --dry-run (-n)      print commands without running
just --fmt --unstable    format the justfile in place
just --choose / --completions SHELL / --init
```

---

## 15. The house harness (five verbs, six files)

Split **by audience, not by topic**. A higher verb *calls* the lower one — never re-list steps.

```text
server.just       root · set shell := ["nu","-c"] · imports every layer
└── scripts/
    ├── _shared.just  PRIVATE · vars (PROJECT/VERSION/PKG_ID), _helpers, `list` (the default)
    ├── dev.just      LOOP    · run · watch · build · clean        (human, tight loop)
    ├── check.just    FIX·WRITES · fmt · lint · types · (audit, opt) · check
    ├── test.just     PROVE   · test · test NAME · watch · cov      (reads only)
    ├── ci.just       AUTOMATE· ci(check+test) · commit · hooks
    └── deploy.just   SHIP    · release · deploy · publish
```

**Composition ladder** (change `fmt` once → every verb above inherits it):

```text
check   = fmt + lint + types      · audit folds into ci when wanted (slower/network)
ci      = check + test
commit  = ci + git commit         · never commit a red tree
publish = ci + release + deploy
```

**Invariants:**
- `check` **writes** (`fmt` rewrites, `lint --fix`, `types` reads) — the "make it right" button, not a report.
- `test` **only reads** — proves behavior, mutates nothing. Form-correctness and behavior-correctness fail for different reasons; keep them independent.
- Exactly **three checks** (`fmt`/`lint`/`types`); `check` is their umbrella, not a fourth thing. `audit` is the optional fourth (`cargo audit`, `flake-checker --no-telemetry`), kept out of default `check`.
- **`list` is the front door** — `[default]` recipe in `scripts/_shared.just`; bare `just` prints the grouped menu.
- **Public verbs are flat; helpers wear a leading `_` + `[private]`** in `scripts/_shared.just`.
- On a CI checkout, `ci` may run `check` in verify-only mode (`fmt --check`, `lint` without `--fix`) so automation never rewrites history.
- The CI YAML calls `just ci` — it does not re-implement the pipeline. The justfile is the source of truth.

**The verb is constant; one line swaps the tool:**

| Verb | Python | Rust | Nix | Web | Nu |
|---|---|---|---|---|---|
| `fmt` | `ruff format` | `cargo fmt` | `alejandra .` | `biome format --write` | `nufmt --stdin` |
| `lint` | `ruff check --fix` | `cargo clippy --fix` | `statix check` + `deadnix` | `biome lint --write` | — |
| `types` | `ty check` | `cargo check` | `nil`/`nix flake check` | `tsc --noEmit` | — |
| `test` | `pytest` | `cargo test` | `nix flake check` | `deno test` | `nu tests/…` |
| `audit` | `uv` audit | `cargo audit` | `flake-checker --no-telemetry` | — | — |

**Minimal harness (copy as the skeleton):**

```just
# server.just (root)
set shell := ["nu", "-c"]
import 'scripts/_shared.just'
import 'scripts/dev.just'
import 'scripts/check.just'
import 'scripts/test.just'
import 'scripts/ci.just'
import 'scripts/deploy.just'
```
```just
# scripts/_shared.just — private base + front door
PROJECT := "demo"
VERSION := `git describe --tags --always`

[default]
[group('meta')]
list:
    @just --list --unsorted

[private]
_clean-tree:
    if (git status --porcelain | is-not-empty) { error make {msg: "working tree dirty"} }
```
```just
# scripts/check.just — make it right, in place
[group('check')]
fmt:
    ruff format .
[group('check')]
lint:
    ruff check --fix .
[group('check')]
types:
    ty check
[group('check')]
check: fmt lint types        # composition, not a 4th verb
```
```just
# scripts/ci.just — automate + guard
[group('ci')]
ci: check test               # the one thing a PR must pass
[group('ci')]
commit msg: ci               # ci runs first; only a green tree commits
    git add -A
    git commit -m {{msg}}
```

---

## 16. Gotchas (the traps that cause parse errors / wrong output)

```just
# ❌ `=` instead of `:=` for a variable
name = "demo"
# => error: Expected ':=', '[', comment, end of line, or identifier, but found '='
# ✅
name := "demo"
```
**Lesson:** variables use `:=`; only recipe *parameter defaults* use `=` (`build mode="debug":`).

```just
# ❌ mixed tabs and spaces in a recipe body
build:
	    cargo build          # tab then spaces
# => error: Found a mix of tabs and spaces in leading whitespace
# ✅ pick one (spaces) and be consistent within the recipe
```
**Lesson:** indent recipe bodies with spaces, consistently.

```just
# ❌ expecting shell state to survive between lines
setup:
    x=hello
    echo $x                 # empty — new shell per line
# ✅ one process: shebang / [script] recipe (or && chain on one line)
setup:
    #!/usr/bin/env nu
    let x = "hello"
    print $x
```
**Lesson:** each plain recipe line is a fresh shell; persist state with a shebang/`[script]` body.

```just
# ❌ trying to define a flag
build --release:            # this is NOT a flag — it's a malformed param name
# ✅ positional + conditional
build mode="debug":
    cargo build {{ if mode == "release" { "--release" } else { "" } }}
```
**Lesson:** just has no flags; use positional params with defaults.

```just
# ❌ a just var referenced as a shell var
url := "https://x"
serve:
    ./app $url              # $url is empty in the shell
# ✅ either interpolate, or export
serve:
    ./app {{url}}           # just interpolation
# …or: export url := "https://x"   → then $url works
```
**Lesson:** `{{var}}` for just vars; `$var` only for `export`ed / dotenv / `$`-param env vars.

One-line traps:
- **Args with spaces split** — quote interpolations: `cmd "{{arg}}"`, or `[positional-arguments]` + `"$1"`.
- **Shebang recipes ignore `set shell`** — they run under their own `#!` interpreter.
- **Subsequent deps need `&&`** — `r: a b` runs a,b *before* the body; `r: && c` runs c *after*.
- **Dependencies dedupe and run once** — list freely; `publish: ci release deploy` runs `ci` a single time.
- **A param-carrying first recipe breaks bare `just`** — keep `list`/`[default]` parameter-less.
- **`mod` needs `set unstable`** in older releases; `which()` needs `set lists`.
- **`import` shares scope, `mod` does not** — duplicate names across imports need `set allow-duplicate-recipes`.

---

## 17. Cheat sheet (20% used 80%)

```just
set shell := ["nu", "-c"]            import 'scripts/_shared.just'        [private] _helper:

x := "v"      v := `git rev-parse HEAD`      p := dir / "sub"     # := / backtick / path-join
recipe dep1 dep2 && after:  body              # prior deps, then body, then `&&` deps
build target="debug":   cargo build {{target}}        # default param
test *args:   cargo test {{args}}            backup +files:  tar czf b.tgz {{files}}
run $PORT="80":  ./srv                       # $ exports param to env

@quiet:   echo hi                            -ignore:  rm maybe-missing      # sigils
[group('check')] [confirm] [no-cd] [positional-arguments] [parallel] [working-directory('x')]

# expressions
mode := if os() == "linux" { "gnu" } else { "other" }
{{ if x == "a" { "y" } else { "z" } }}       {{ env('HOME') }}   {{ justfile_directory() }}

# multi-line state
job:
    #!/usr/bin/env nu
    ls | where size > 1mb | get name | print

# composition
check: fmt lint types        ci: check test        commit msg: ci
    git add -A; git commit -m {{msg}}

# CLI
just            just --list        just --show R       just -n R (dry-run)
just --choose   just --fmt --unstable        just --set VAR v R
```

---
## Connections
- Pairs with [[nushell]] (every recipe line is `nu -c …`; bodies are pipelines, loops are the escape hatch).
- Harness manifest: verbs fixed, tools swapped · `check` writes / `test` reads · `list` is the front door · public flat, private `_`+`[private]`.