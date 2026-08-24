---
name: nushell
description: >-
  Use this skill when writing or debugging `.nu` scripts, waybar / `just` /
  config helpers, or NixOS home-manager `extraConfig` snippets in Nushell
  0.114 (tested against 0.114.1; core syntax holds back to ~0.110). Covers the
  structured-data model (list/record/table/closure/cell-path), immutable
  `let`/`mut`/`const` bindings and `$env`, pipelines and `$in`, the ~35-command
  core vocabulary (`where`/`each`/`reduce`/`select`/`group-by`/`update`/
  `upsert`/`par-each`/`union`/`intersect`/…), `match`/`if`/`try` control flow,
  typed `def` signatures, flag-dispatch `main` CLIs, modules and
  `_shared.nu`, `try`/`catch`/`finally`/`error make`, external commands via
  `complete`, and data (de)serialization. Reach for this whenever building or
  debugging a script, wiring a house-style CLI helper, or asking "how do I do
  X in nushell." Also use for errors like "Capture of mutable variable",
  "Cannot find column", a lost `$env`/`cd` after a function returns, an
  external command aborting the whole pipeline, or confusion after upgrading
  past 0.114 (`str upcase` deprecation, stricter default runtime type checks,
  submodules no longer implicitly imported).
metadata:
  package: nushell
  version: "0.114 (tested against 0.114.1; core syntax stable back to ~0.110)"
  verified: 2026-08-01
  source_of_truth: >-
    Refresh of a prior house-style reference (nushell.md, verified
    2026-07-27), cross-checked against the official Nushell 0.114.0 release
    notes for version drift.
  upstream: https://www.nushell.sh/blog/2026-07-04-nushell_v0_114_0.html
---

# [[nushell]] [[skill]]

> [!abstract] Purpose
> Authoritative, code-first Nushell 0.114 reference. The 20% of the language
> used 80% of the time, the traps that produce silently wrong output, and the
> house idioms (typed signatures, pipeline-first, records-not-tuples,
> flag-dispatch `main`, `_shared.nu`).

## 📥 Inputs

- **Context:** `.nu` scripts, `_shared.nu` modules, waybar/`just`/config
  helpers, NixOS home-manager `extraConfig`.
- **Constraints:** Targets Nushell **0.114**. Frequent breaking changes
  between minors — pin syntax to ≥0.110, flag anything older. Nushell is
  **not** bash: no word-splitting, no `$()`, no implicit stringly-typed data.
- **Anti-use:** Not for general "how do I script X" advice unrelated to
  Nushell specifically, and not for documenting Nushell plugins or the Polars
  dataframe surface (`polars *`) — that's a different, much larger facet this
  skill does not cover.

## 📤 Outputs

- **Result:** Idiomatic, typed Nushell — every `def` carries
  `[params]: input -> output`, pipelines over loops, records over positional
  tuples.
- **Side Effects:** Files via `save`, env via `def --env`, external processes
  via `^cmd` / `run-external`.

## ⛓️ Workflow

1. **Shape the data first.** Decide the record/table shape returned; design
   the pipeline around it.
   ```nu
   def state []: nothing -> record { {pct: 50, muted: false} }
   ```
2. **Pipeline, don't loop.** `cmd | where … | each {…} | reduce …`. Reach for
   `for` only for pure side effects.
3. **Dispatch by flag.** One typed `main`, branch on `--flags`; helpers stay
   tiny and named.
   ```nu
   def main [--get --up --down]: nothing -> nothing { if $up { … } else { … } }
   ```
4. **Format + check.** `nufmt --stdin` to format, `nu --lsp` for diagnostics,
   `nu --ide-check 0 script.nu` to parse-check.

## 🧭 Reference map

| File | Load when |
|---|---|
| This file (`SKILL.md`) | always |
| [language-reference.md](language-reference.md) | writing or debugging actual `.nu` syntax — full value/type table, the command vocabulary, control flow, `def`/closure/error/external syntax, data-format round-tripping, and the modules/`main`/`_shared.nu` pattern |

## 📋 Core invariants

Violate these and you get silently wrong output, not a helpful error.

1. Every value is typed — `ls`/`open`/pipeline stages return
   records/tables/lists, not strings. Only touch text at the edges
   (`^external`, `save`, raw parse).
2. `let` is immutable; `mut` **cannot be captured by a closure** — `each` /
   `where` / `par-each` never mutate outer state. Accumulate with `reduce`.
3. `if` / `match` / `try` are expressions — bind the result with `let` rather
   than relying on side effects inside the branches.
4. Parse-time (`const`, `use`, `source`) resolves before any runtime —
   `source`/`use` need a parse-time-known path; only `const` is visible then.
5. `$env` and `cd` mutations inside a plain `def` are **discarded on
   return** — mark it `def --env` to persist them to the caller.
6. `$in` is consumed once — bind `let x = $in` before reading it a second
   time.
7. A failing external command **aborts the whole pipeline** by default — wrap
   in `do { } | complete` to inspect instead of abort.
8. Since 0.114, `enforce-runtime-annotations` is **opt-out (on by default)** —
   a typed `let` that silently held the wrong runtime value before may now
   raise at runtime. Disable with
   `NU_EXPERIMENTAL_OPTIONS="enforce-runtime-annotations=false"` if a script
   built for an older version starts erroring.
9. Nushell is **not bash** — no `$(...)`, no `[[ ]]`, no `${VAR}`, no
   glob-as-string. Subexpressions are `(...)`, interpolation is
   `$"...($x)..."`, externals need a leading `^` when a built-in shadows
   them.

## ⚠️ Gotchas

**Mutable capture**

```nu
# ❌ mut captured by a closure
mut x = 0
[1 2 3] | each { $x += 1 }
# => Error: nu::parser::expected_keyword
# =>   × Capture of mutable variable.
# ✅ fold instead
[1 2 3] | reduce -f 0 {|it, acc| $acc + 1 }
```
**Lesson:** never mutate outer state from `each`/`where`/`par-each`. Use
`reduce`, or build a list and aggregate.

**Missing column**

```nu
# ❌ column may be absent
$user | get email
# => Error: nu::shell::column_not_found
# =>   × Cannot find column 'email'
# ✅ optional access or default
$user.email? | default "n/a"
$user | get -o email | default "n/a"
```
**Lesson:** any field that can be missing gets `?` / `get -o` / `default`.

**Lost `$env`/`cd`**

```nu
# ❌ env/cd lost after the function returns
def goto [d: path] { cd $d }        # caller's PWD unchanged
# ✅ mark the function env-mutating
def --env goto [d: path] { cd $d }
```
**Lesson:** `cd` and `$env.*` need `def --env` to escape the function.

**External failure kills the pipeline**

```nu
# ❌ a failing external kills the pipeline
^grep missing file.txt | lines     # nonzero exit aborts everything
# ✅ capture and branch
let r = (do { ^grep missing file.txt } | complete)
if $r.exit_code == 0 { $r.stdout | lines } else { [] }
```
**Lesson:** wrap fallible externals in `do { } | complete`.

**One-line traps**
- **`str collect` / `build-string` are removed** — use `str join` and `$"..."`.
- **`let-env X = …` is removed** — assign `$env.X = …`.
- **`str upcase`/`str downcase` are deprecated (0.114)** — use `str uppercase`
  / `str lowercase`; the old names still work but print a warning.
- **`ls.name` is a parse error** — parenthesize command output: `(ls).name`
  or `ls | get name`.
- **`each` returns a list even when you wanted only side effects** — append
  `| ignore` or use `for`.
- **`$in` reads once** — bind `let xs = $in` if you need it again.
- **Optional flag omitted = `null`, not `false`** — test `--set` with
  `$set != null`.
- **`reduce` element comes first, accumulator second**:
  `{|it, acc| …}` with `-f INIT`.
- **`where size > 1mb` is a row-condition, not a closure** — the closure form
  is `where {|r| $r.size > 1mb}`; don't mix.
- **`source`/`use` need parse-time-known paths** — use `const`, never a
  `let`/runtime string.
- **`save` won't overwrite** without `-f`; **`to json`** pretty-prints unless
  `-r`.
- **Importing a module no longer implicitly imports its sub-modules
  (0.114, breaking)** — `use foo` then `foo sub baz` now fails; either
  `export use sub` inside the outer module, or `use foo/sub` explicitly.
  *(from official changelog, not hand-run against this repo's modules)*

## 📝 Cheat sheet

```nu
let x = 5                          mut n = 0          const C = "f.nu"
$env.K = "v"                       $env.PATH = ($env.PATH | prepend "/x" | uniq)

# pipeline data plumbing
ls | where type == dir | select name size | sort-by size | last 5
$t | get col       $t | update col {|r| $r.col + 1 }      $t | upsert col 0
$t | reject secret      $t | group-by status      $t | transpose k v
[1 2 3] | each {|x| $x * 2 }       [1 2 3] | reduce -f 0 {|it, acc| $acc + $it }
$r.field?  | default 0             $list | enumerate | each {|e| $"($e.index): ($e.item)" }
[1 2 3 4] | union [3 4 5]          [1 2 3 4] | intersect [3 4]      [1 2 3 4] | difference [3 4]

# strings
$"hi ($name)"      "a,b" | split row ","      "x=1" | parse "{k}={v}"
"  s " | str trim       [a b] | str join "-"       $s | into int
"HI" | str lowercase    "hi" | str uppercase        # 0.114+ names (upcase/downcase deprecated)

# control flow (expressions)
let y = (if $c { 1 } else { 2 })
match $x { 1 => "one", _ if $x > 9 => "many", _ => "few" }

# defs — POSIX `--` end-of-options works on any of these (0.114+)
def f [a: int, --flag, --n: int = 1]: int -> int { $in + $a }
def --env setup [] { $env.READY = true }
def main [--up --down] { if $up { … } else { … } }
greet -- -Alice                    # "-Alice" forced positional, not a flag

# closures / externals / errors
do { ^cmd ...$args } | complete            # {stdout, stderr, exit_code}
try { risky } catch {|e| $e.msg } finally { … }
error make {msg: "bad"}

# data
open f.json | get k      $x | to json -r      ls | to csv | save -f out.csv
'1.2.3' | into semver | semver bump minor      # => 1.3.0  (0.114+)
```

## Connections

- Uses [[ai-skills|AI Skills Index]]
- Derived via [[derive]] [[skill]] from a prior house-style Nushell reference

## 🔄 Provenance

**Source:** started from a prior house-style Nushell reference
(`nushell.md`, verified 2026-07-27, targeting 0.113/0.106+); refreshed
2026-08-01 by folding in the official Nushell 0.114.0 (2026-07-04) and
0.114.1 (2026-07-11) release notes from `nushell.sh/blog`.

**What changed in this refresh:** version pin bumped 0.113→0.114; added the
`str upcase`/`str downcase` deprecation, the submodule-implicit-import
breaking change, the `enforce-runtime-annotations` opt-out default, POSIX
`--` end-of-options parsing, the new `run` command, and the new
`union`/`intersect`/`difference`/`combinations`/`permutations`/SemVer
builtins.

**What's NOT covered (unknown, not absent):** the Polars dataframe plugin
surface (`polars *`), the `idx` fuzzy-search/indexing command family, plugin
authoring, and the LSP/reedline internals — these are real facets but weren't
mined this pass; split them out if a task needs them.

**Unverified:** the 0.114-specific additions above are sourced from the
official changelog, not hand-run against this repo's actual scripts — treat
them as correct-per-docs rather than battle-tested house idiom until they've
actually been used here.

**To refresh:** compare `nu --version` and the latest `nushell.sh/blog` entry
against `metadata.verified` above; re-run `derive` if the minor version has
moved. When live behavior and this doc disagree, `nu --help` / `nu --lsp` win.
