---
name: just
description: >-
  Authoritative `just` command-runner reference pinned to 1.57.0, plus the five-verb nushell
  harness. Covers recipes and dependency ordering (`&&` subsequent deps, dedup, `[parallel]`), the
  `@` `-` `?` sigils, positional/variadic/`$`-exported parameters plus the real `--long`/`-s`
  flags added in 1.46 via `[arg]`, `:=` vs `=`, backticks, f-strings, conditionals, 45 attributes,
  30 settings, 84 built-in functions, 32 constants, shebang and `[script]` recipes, `import` vs
  `mod`, and the unstable frontier (`set lists`, user-defined functions, `[cache]`). Pairs with
  nushell via `set shell := ["nu", "-c"]`. Reach for this when writing or editing a justfile,
  adding flags to a recipe, structuring dev/check/test/ci/deploy layers, or wiring CI to `just
  ci`. Also use for errors like "expected '*', ':', '$', identifier, or '+', but found '='",
  "found a mix of tabs and spaces in leading whitespace", "unknown start of token '-'", "parameter
  not set", "has circular dependency", or "the `lists` setting is currently unstable".
metadata:
  repo: casey/just
  version: 1.57.0
  commit: unknown (pinned by release tag 1.57.0, published 2026-07-19)
  verified: 2026-07-28
  source_of_truth: upstream README.md (the Programmer's Manual) at master, cross-checked against the GitHub release changelog 1.43.0→1.57.0, with every error message and behavioral claim reproduced against a locally installed 1.57.0 binary
  upstream: https://just.systems/man/en/ · official minimal agent skill at https://github.com/casey/just/blob/master/skills/just/SKILL.md
---

# [[just]] [[skill]]

> [!abstract] Purpose
> Code-first `just` reference pinned to 1.57.0, plus the house build harness. The recipe/parameter/expression surface, the traps that produce parse errors or silently wrong output (with verbatim 1.57.0 error text), and the five-verb layered skeleton (`dev`/`check`/`test`/`ci`/`deploy`) that drops into any repo unchanged.

## 📥 Inputs

- **Context:** a `justfile` (or `.justfile`, `justfile.md`, `_shared.just`, layer files, `mod` sources), invoked by a human at a terminal or by CI calling `just ci`.
- **Constraints:** runner is `just` ≥ 1.46 for the flag/option surface, ≥ 1.53 for lists, ≥ 1.54 for `[cache]`. Shell is nushell (`set shell := ["nu", "-c"]`); the just default is `sh -cu`. Not `make`, not bash. Tools are assumed present — recipes never probe for them or fall back.
- **Anti-use:** not a build system. If you need file-timestamp dependency tracking, incremental compilation, or output-freshness rules, `just` is the wrong tool — reach for the language's native build tool and let `just` *call* it. Don't use this skill for `make`/`Taskfile`/`mise` syntax, and don't use it to author shell scripts that merely happen to live in a repo.

## 📤 Outputs

- **Result:** a justfile whose *verbs* are fixed and portable across repos, where only the tool inside each recipe changes per language, and where `just` with no arguments prints a grouped menu.
- **Side effects:** `check`-family recipes rewrite the working tree (`fmt`, `--fix`); `test`-family only reads; `deploy`-family ships. `[cache]` recipes write a `.justcache/` directory beside the justfile (git-ignore it). Shebang/`[script]` bodies are written to a temp file before execution.

## ⛓️ Workflow

```just
set shell := ["nu", "-c"]          # every recipe line runs as `nu -c '<line>'`

PROJECT := "demo"                  # `:=` assigns
VERSION := `git describe --tags --always`   # backticks capture stdout

[default]
[group('meta')]
list:                              # bare `just` lands here
    @just --list --unsorted

[group('check')]
fmt:
    ruff format .

[group('check')]
check: fmt                         # dependency: runs BEFORE the body, once

[group('ci')]
ci: check test                     # compose verbs; never re-list steps
```

When writing a recipe, answer in order: **(1)** which layer owns it (who runs it, when)? that's the file. **(2)** does it write or only read? declare it. **(3)** can it *call* an existing verb instead of re-listing steps? compose up. **(4)** is it a pipeline? reach for `open | where | each` before a loop. **(5)** private? leading `_` plus `[private]`. **(6)** discoverable from bare `just`? if not, it isn't done.

## 🧭 Reference map

| File | Load when |
|---|---|
| **this file** | always — model, recipes, deps, sigils, parameters, expressions, CLI |
| [attributes-settings.md](attributes-settings.md) | you need a knob: any `[attribute]`, any `set NAME`, env/dotenv/export, shell config, working directory, OS gating, or the `[arg]` flag/option system |
| [functions.md](functions.md) | you need a specific built-in function or constant by name |
| [harness.md](harness.md) | structuring across files: `import` vs `mod`, the five-verb layout, nushell bodies, CI wiring |
| [unstable.md](unstable.md) | you have `set unstable`: lists, user-defined functions, cached recipes |

## 📋 Core invariants

Violate these and you get a plausible-looking justfile that misbehaves, not an error.

1. **`:=` assigns; `=` only sets a parameter default.** `x := "v"` at top level, `build mode="debug":` in a signature. Swapping them is the #1 parse error.
2. **Each plain recipe line is a fresh shell process.** Shell variables, `cd`, and `set -e` state do not survive to the next line. Multi-statement logic needs a shebang or `[script]` body.
3. **`{{x}}` and `$x` are different namespaces.** `{{x}}` is just-side interpolation resolved before the shell sees it; `$x` is shell-side and only exists for `export`ed vars, `$`-prefixed parameters, dotenv vars, and `[env(...)]`. A plain `x := …` read as `$x` is empty.
4. **just is a command runner, not a build system.** No `.PHONY`, no implicit rules, no timestamp graph. Every recipe runs every time.
5. **Dependencies run first, and exactly once.** They deduplicate across the whole invocation regardless of CLI order. `&&` after the dependency list defers those deps until *after* the body.
6. **just has real flags as of 1.46 — the old "just has no flags" advice is dead.** `[arg(NAME, long)]` / `[arg(NAME, short)]` / `[arg(NAME, value=V)]` produce genuine `--long`, `-s`, and valueless flags. Reaching for a positional-plus-conditional workaround is now a code smell, not a necessity.
7. **Shebang and `[script]` recipes ignore `set shell`.** They run under their own interpreter. Setting `set shell := ["nu","-c"]` does not make a `#!/usr/bin/env bash` body nushell.
8. **Errors resolve statically where possible.** Unknown recipes, circular dependencies, and duplicate definitions are reported before anything runs — so a parse-clean justfile is worth more than a defensive one.
9. **Unstable features fail loudly, not silently.** `set lists`, user-defined functions, and `[cache]` abort unless unstable is enabled; they may change in backwards-incompatible ways, so pin them deliberately.

## ⚠️ Gotchas

All error text below was reproduced verbatim against `just 1.57.0`. Earlier notes that quote capitalized messages ("Expected ':='…", "Found a mix…") are from pre-1.5x releases and no longer match.

**Parse-time**

```just
# ❌ `=` where `:=` was meant
name = "demo"
# error: expected '*', ':', '$', identifier, or '+', but found '='
#  ——▶ justfile:1:6
# ✅
name := "demo"
```
**Cause:** the parser reads `name` as a recipe name and expects a parameter or `:`. **Fix:** `:=` for variables; `=` only inside a signature (`build mode="debug":`).

```just
# ❌ tab followed by spaces in a body
build:
→    echo hi
# error: found a mix of tabs and spaces in leading whitespace: `␉␠␠␠␠`
# leading whitespace may consist of tabs or spaces, but not both
# ✅ pick spaces, stay consistent within the recipe
```
**Cause:** unlike `make`, `just` accepts either indent character but not both in one line. **Fix:** four spaces; run `just --fmt` (stable since 1.50, no `--unstable` needed) to normalize.

```just
# ❌ writing a flag directly into the signature
build --release:
# error: unknown start of token '-'
#  ——▶ justfile:1:7
# ✅ 1.46+: declare it as an option
[arg('release', long, value='--release')]
build release='':
    cargo build {{release}}
# just build --release
```
**Cause:** a signature accepts parameter names, not option spellings. **Fix:** the `[arg]` attribute — see [attributes-settings.md](attributes-settings.md).

```just
# ❌ same name twice
a:
    echo 1
a:
    echo 2
# error: recipe `a` first defined on line 1 is redefined on line 3
# ✅ rename, or `set allow-duplicate-recipes` when overriding an import
```

**Runtime**

```just
# ❌ expecting shell state to survive between lines
setup:
    x=hello
    echo "[$x]"
# sh: 1: x: parameter not set
# error: recipe `setup` failed on line 3 with exit code 2
# ✅ one process
setup:
    #!/usr/bin/env nu
    let x = "hello"
    print $x
```
**Cause:** every line is its own `sh -cu` (or `nu -c`) invocation. **Fix:** shebang body, `[script]` attribute, or fold into a single pipeline.

```just
# ❌ a just variable read as a shell variable
url := "https://x"
serve:
    echo "[$url]"
# sh: 1: url: parameter not set
# ✅ interpolate, or export
serve:
    echo "[{{url}}]"
# …or: export url := "https://x"   → then $url works
```

```just
# ❌ unquoted interpolation containing spaces
search q:
    echo {{q}}
# `just search "cat toupee"` runs: echo cat toupee   → two arguments
# ✅
search q:
    echo "{{q}}"
```
**Cause:** interpolation happens before the shell splits words. **Fix:** quote the interpolation, or use `[positional-arguments]` and `"$1"`.

```just
# ❌ unstable feature without the gate
set lists
# error: the `lists` setting is currently unstable, invoke `just` with `--unstable`,
# set the `JUST_UNSTABLE` environment variable, or add `set unstable` to your `justfile`
# ✅
set unstable
set lists
```

**Structural**

- **Circular dependencies abort before anything runs** — `error: recipe `b` has circular dependency `a -> b -> a``. Cheap to hit while composing verbs; the message names the full cycle.
- **Unknown recipe** — `error: justfile does not contain recipe `nope``. Static, so typos never half-execute a pipeline.
- **A parameter-carrying first recipe breaks bare `just`** — keep `list` / the `[default]` recipe parameter-less.
- **`import` shares scope, `mod` does not** — duplicate names across imports need `set allow-duplicate-recipes`; `mod` recipes are addressed `sub::recipe`.
- **`set windows-shell` and `set windows-powershell` are deprecated** — use the `[windows]` attribute on `set shell` instead.

## 📝 Cheat sheet

```just
set shell := ["nu", "-c"]     import '_shared.just'      mod sub        [private] _helper:

x := "v"        v := `git rev-parse HEAD`      p := dir / "sub"       m := f'{{x}}-{{v}}'
recipe dep1 dep2 && after:  body               # prior deps → body → `&&` deps (all dedup'd)
build target="debug":   cargo build {{target}}          # positional param with default
test *args:  cargo test {{args}}               backup +files:  tar czf b.tgz {{files}}
run $PORT="8080":  ./srv                       # `$` exports the param into the environment

[arg('release', long, value='--release')]      # REAL flag (1.46+): just build --release
[arg('jobs', short, long)]                     # -j 4  /  --jobs 4  /  --jobs=4
[arg('n', pattern='\d+')]                      # reject arguments that don't match

@quiet:  echo hi        -ignore:  rm maybe-missing        ?guard:  test -f x    # sigils
[group('check')] [confirm] [no-cd] [positional-arguments] [parallel] [working-directory('x')]

mode := if os() == "linux" { "gnu" } else { "other" }        # ==  !=  =~  !~  &&  ||  +  /
{{ if x == "a" { "y" } else { "z" } }}     {{ env('HOME') }}     {{ justfile_directory() }}

job:                          # multi-line state needs one process
    #!/usr/bin/env nu
    ls | where size > 1mb | get name | print

check: fmt lint types         ci: check test          commit msg: ci
    git add -A; git commit -m {{msg}}

# CLI
just                    just RECIPE a b          just R1 R2            just --list (-l)
just --show R (-s)      just --summary           just --usage R        just --dry-run (-n)
just --evaluate [VAR]   just --variables         just --json           just --dump
just --set VAR v R      VAR=val just R           just --yes R          just --group NAME
just --choose           just --fmt               just --time           just --clean
```

---

## 1. Mental model

- **Command runner, not a build system.** No `.PHONY`, no implicit rules, no timestamp graph. Recipes are named task verbs and always run. (Opt-in skipping exists via unstable `[cache]` — see [unstable.md](unstable.md).)
- **Not `make`, not bash.** No tab-significant *rules*, no `$()` idioms borrowed from make. With `set shell := ["nu","-c"]`, new recipe logic is nushell pipelines.
- **Two namespaces in a body.** `{{x}}` is resolved by just; `$x` is resolved by the shell. See invariant 3.
- **Static resolution first.** Unknown recipes, circular deps, and redefinitions are caught before execution.
- **Flags exist now.** 1.46 introduced `[arg]` long/short options; 1.55 added combinable short options (`-abc`), repeatable variadic options, and `short` defaulting to the parameter's first character; 1.56 added `min`/`max`.

## 2. Recipes & dependencies

```just
build:                              # name, then an indented body
    cc main.c -o main

test: build                         # PRIOR dependency → runs before the body
    ./test

deploy: build && notify cleanup     # `&&` SUBSEQUENT deps → run after the body
    ./ship

default: (build "release")          # dependency WITH arguments → parenthesize
build target="debug":
    cargo build --profile {{target}}
```

- Dependencies run **first** and **once** (deduplicated) even if named after their dependents on the CLI.
- Recipes named on the CLI run left to right: `just build test`.
- A failing line aborts the recipe; prefix `-` to tolerate failure, `?` to stop this recipe but let others continue (needs `set guards`).
- `alias b := build` makes a CLI alias. Bare `just` runs the `[default]` recipe, else the first recipe. `set default-list` (1.52) makes bare `just` list instead of run.
- `[parallel]` (1.42) runs *that recipe's* dependencies concurrently.
- The comment immediately above a recipe becomes its `--list` doc string; `[doc('…')]` overrides it, bare `[doc]` suppresses it.

## 3. Line sigils

| Prefix | Effect |
|---|---|
| `@cmd` | don't echo the line before running it |
| `-cmd` | ignore a non-zero exit; keep going |
| `?cmd` | exit status 1 stops **this** recipe; other recipes continue (needs `set guards`, 1.47) |
| `@-cmd` / `-@cmd` | combine freely; any order |
| `@recipe:` | invert echoing for the whole recipe (prefix on the name line) |

```just
clean:
    -rm -rf dist        # fine if dist doesn't exist
    @echo "cleaned"     # runs without being echoed
```

`set quiet` silences all echoing globally; `[no-quiet]` overrides it per recipe. Exit codes other than 0 and 1 are reserved after a `?` sigil.

## 4. Parameters

```just
greet name greeting="hi":       # positional; `greeting` has a default
    @echo "{{greeting}}, {{name}}"

backup +files:                  # `+` variadic: ONE or more, space-joined
    tar czf backup.tgz {{files}}

test *args:                     # `*` variadic: ZERO or more
    cargo test {{args}}

run $PORT="8080":               # `$` exports the parameter as an env var
    ./server                    # reads $PORT from the environment

test triple=(arch() + "-unknown-unknown"):    # defaults may be expressions
    ./test {{triple}}
```

Turning parameters into flags is an `[arg]` attribute, not a signature change — full table in [attributes-settings.md](attributes-settings.md). Quick form:

```just
[arg('release', long, value='--release')]     # valueless flag
[arg('jobs', short, long)]                    # -j 4, --jobs 4, --jobs=4
[arg('file', long)]                           # variadic option → repeatable
backup +file:
    scp {{file}} me@server.com:
```

`just --usage RECIPE` (1.46) prints the generated usage message, including `[arg(help=…)]` strings.

## 5. Variables, expressions, conditionals

```just
name    := "demo"
version := `git describe --tags --always`      # backtick = captured stdout
full    := name + "-" + version                # `+` concatenates
path    := justfile_directory() / "dist"       # `/` joins paths
label   := f'{{name}} v{{version}}'            # f-string (1.44), `{{{{` escapes a literal

profile := if version =~ '-dirty$' { "debug" } else { "release" }
```

Operators: `==`, `!=`, `=~` (regex), `!~`, `&&`, `||`, `+`, `/`. Conditionals are `if C { A } else { B }` and chain with `else if`. `set lazy` (stable 1.48) skips evaluating unused variables — useful when a backtick is expensive. `assert(cond, "msg")` and `error("msg")` abort evaluation.

## 6. Strings

| Form | Behavior |
|---|---|
| `'single'` | raw — no escape sequences |
| `"double"` | escapes: `\n` `\t` `\r` `\"` `\\` `\u{1F916}` |
| `'''…'''` / `"""…"""` | multiline; strips the leading line break and common leading whitespace |
| `f'…{{expr}}…'` | format string (1.44); `{{{{` yields a literal `{{` |
| `{{ expr }}` | interpolation in bodies, assignments, and parameter defaults |
| `\` at end of line | line continuation inside a recipe body |

`{{…}}` interpolation does **not** work inside ordinary string literals — only in recipe bodies and f-strings.

## 7. Shebang & script recipes

A body whose first line is `#!` runs as **one** script in a single process, so variables persist across lines. `[script]` / `[script('CMD')]` (stabilized 1.44) does the same without a shebang, taking its interpreter from `set script-interpreter` (default `['sh','-eu']`).

```just
report:
    #!/usr/bin/env nu
    let files = (fd -e rs | lines)
    print $"($files | length) rust files"

[script('nu')]
summary:
    ls **/*.nu | length | print
```

`set default-script` (1.52) makes every recipe a script recipe by default; `[shell]` (1.52) opts a single recipe back out.

## 8. Command-line usage

```text
just                       run the [default] / first recipe
just RECIPE a b            run with positional arguments
just RECIPE --opt v        run with [arg]-declared options
just R1 R2                 chain recipes, left to right
just --list (-l)           grouped menu; --unsorted keeps file order
just --group NAME          filter --list / --choose to one group (1.47)
just --choose              fuzzy-pick a recipe (skim / fzf)
just --show RECIPE (-s)    print a recipe's source, with attributes and docs (1.56)
just --usage RECIPE        print generated usage / options help (1.46)
just --summary             one-line list of recipe names
just --evaluate [VAR]      print all variables, or one value
just --variables           list variable names
just --dump                normalized justfile;  --json for machine-readable (1.48)
just --set VAR val R       override a variable for this run
VAR=val just R             override via the environment
just --yes R               auto-confirm [confirm] recipes
just --dry-run (-n)        print commands without running them
just --fmt                 format in place (stable since 1.50)
just --time                print recipe execution time (1.49)
just --timestamp           prefix commands with timestamps
just --clean [R]           clear [cache] entries;  --no-cache bypasses the cache
just --completions SHELL   shell completions;  --init scaffolds a justfile
```

Some options also read environment variables — notably `JUST_UNSTABLE`. Because the environment is inherited, that propagates into recursive `just` invocations, whereas a command-line flag does not.

## Connections

- Uses [[ai-skills|AI Skills Index]]
- Pairs with [[nushell]] — every recipe line is `nu -c …`; bodies are pipelines, loops are the escape hatch.
- Segmented into [[attributes-settings]], [[functions]], [[harness]], [[unstable]].
- Derived with [[derive]] [[skill]] v2.

## 🔄 Provenance

Pinned to **just 1.57.0**, released 2026-07-19; verified 2026-07-28. Derived from the upstream Programmer's Manual (`README.md` at master), the release changelog from 1.43.0 through 1.57.0, and a locally installed 1.57.0 binary used to reproduce every error message quoted in Gotchas.

**Corrected against the prior house note**, which was pinned near 1.54 and had drifted:
- "just has no flags" is false from 1.46 onward — `[arg]` provides long, short, valueless, and repeatable options.
- `just --fmt` no longer requires `--unstable` (stabilized 1.50).
- Error messages were capitalized in older releases and are now lowercase with different token lists; all quoted text has been re-captured.
- `set windows-shell` / `set windows-powershell` are deprecated in favor of `[windows]` on `set shell`.
- `mod` has been stable since 1.31 and does not need `set unstable`.

**Not covered here (unknown, not absent):** Windows-specific path and shell behavior beyond the deprecation note, remote justfiles, `just.sh`, `package.json` script compatibility, signal-handling internals, completion-script installation, and the `just-lsp` / `just-mcp` companion projects.

**To refresh:** compare `curl -s https://api.github.com/repos/casey/just/releases/latest` against the pinned version above; diff the Attributes, Settings, and Functions tables in the upstream README against [attributes-settings.md](attributes-settings.md) and [functions.md](functions.md); re-run the Gotchas snippets against the new binary, since error wording changes between minor releases. An official (much smaller) skill ships in-repo at `skills/just/SKILL.md` and is worth diffing for upstream's own framing.
