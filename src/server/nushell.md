---
name: nushell
description: >-
  Authoritative Nushell 0.113 (0.106+) scripting and language reference. Dense, code-first manual for the structured-data model, immutable/`mut`/`const` bindings and `$env`, pipelines and `$in`, cell paths, records/lists/tables, closures-as-data, the core command vocabulary (`where`/`each`/`reduce`/`select`/`group-by`/`update`/`upsert`/`par-each`/…), `match` and control flow, typed `def` signatures, flag-dispatch `main` CLIs, modules and `scripts/_shared.nu`, `try`/`catch`/`finally`/`error make`, external commands with `complete`, and data (de)serialization. Reach for this whenever writing or debugging `.nu` scripts, waybar / `just` helpers, or shell config. Also use for errors like "Capture of mutable variable", "Cannot find column", lost `$env`/`cd` after a function returns, or an external command's failure aborting the whole pipeline.
---
# [[nushell]] [[skill]]

> [!abstract] Purpose
> Authoritative, code-first Nushell 0.113 reference. The 20% of the language used 80% of the time, the traps that produce wrong output, and the house idioms (typed signatures, pipeline-first, records-not-tuples, flag-dispatch `main`, `scripts/_shared.nu`).

## 📥 Inputs
- **Context:** `.nu` scripts, `scripts/_shared.nu` modules, waybar/`just`/config helpers, NixOS home-manager `extraConfig`.
- **Constraints:** Targets Nushell **0.113**. Frequent breaking changes between minors — pin syntax to ≥0.106; flag anything older. Nushell is **not** bash: no word-splitting, no `$()` , no implicit stringly-typed data.

## 📤 Outputs
- **Result:** Idiomatic, typed Nushell — every `def` carries `[params]: input -> output`, pipelines over loops, records over positional tuples.
- **Side Effects:** Files via `save`, env via `def --env`, external processes via `^cmd` / `run-external`.

## ⛓️ Workflow
1. **Shape the data first.** Decide the record/table shape returned; design the pipeline around it.
   ```nu
   def state []: nothing -> record { {pct: 50, muted: false} }
   ```
2. **Pipeline, don't loop.** `cmd | where … | each {…} | reduce …`. Reach for `for` only for pure side effects.
3. **Dispatch by flag.** One typed `main`, branch on `--flags`; helpers stay tiny and named.
   ```nu
   def main [--get --up --down]: nothing -> nothing { if $up { … } else { … } }
   ```
4. **Format + check.** `nufmt --stdin` to format, `nu --lsp` for diagnostics, `nu --ide-check 0 script.nu` to parse-check.

## 📋 Reference
### House idioms (copy these)
- Type signature on **every** `def`: `def name [args]: input -> output { }`.
- Pipeline-first: `cmd | from json | get x | where y | default z`.
- Records for structured returns; never positional tuples beyond pairs.
- Closures as data: `run_silent { side-effect }`, `capture { ^cmd }`.
- Tiny named helpers over one big function; cross-script utils in `scripts/_shared.nu`, imported `use scripts/_shared.nu *`.

---

## 1. Mental model (the category-error vaccine)

- **Structured, not textual.** Every value has a type. `ls` is a *table*, `open x.json` is a *record*, not strings. Pipe typed values; only touch text at the edges (`^external`, `save`, raw parse).
- **Immutable by default.** `let` binds once. `mut` exists but **cannot be captured by a closure** — so `each`/`where`/`par-each` can't mutate outer state. Accumulate with `reduce`, not a `mut` + loop.
- **Everything is an expression.** `if`, `match`, `try` all return values: `let x = (if $c { 1 } else { 2 })`.
- **Two-stage execution.** Parse-time (definitions, `const`, `use`, `source`) resolves before any runtime. You **cannot** `source` a runtime-computed path or `use` a dynamic module name. `const` is the only value available at parse-time.
- **It is NOT bash.** No `$(...)`, no `[[ ]]`, no `${VAR}`, no glob-as-string. Subexpressions are `(...)`, interpolation is `$"...($x)..."`, externals need a leading `^` when a built-in shadows them.

---

## 2. Values & literals

| Type | Literal | Notes |
|---|---|---|
| `int` / `float` | `42`, `3.14`, `0xff`, `1_000` | |
| `string` | `'raw'`, `"esc\n"`, `$"interp ($x)"`, `` `bare` `` | single = raw, double = escapes |
| `bool` | `true`, `false` | |
| `datetime` | `2026-06-25`, `(date now)` | |
| `duration` | `5min`, `2wk`, `500ms`, `3day` | real arithmetic: `(date now) + 1day` |
| `filesize` | `10mb`, `2gib`, `1kb` | comparable: `where size > 1mb` |
| `range` | `1..10`, `1..<10`, `0..`, `10..1` | `..<` excludes end; lazy |
| `list` | `[1 2 3]`, `[a, b, c]` | commas optional |
| `record` | `{name: "x", age: 3}` | |
| `table` | `[[name age]; [al 30] [bo 25]]` | list of same-shaped records |
| `closure` | `{\|x\| $x * 2 }`, `{ $in + 1 }` | `\|params\|` optional |
| `cell-path` | `$.a.b.0`, `$it.name` | first-class; `get $path` |
| `nothing` | `null` | absence; `is-empty` / `is-not-empty` |

```nu
[...$a ...$b]                 # spread lists
{...$base, role: "admin"}     # spread + override records
^cmd ...$args                 # spread into external args
```

---

## 3. Variables, constants, env

```nu
let x = 10                    # immutable, scoped
mut n = 0                     # mutable — same scope only, NOT closure-capturable
const FILE = "lib.nu"         # parse-time; required by `source`/`use`
$env.API_URL = "https://…"    # set env (string-ish; nushell coerces)
$env.PATH = ($env.PATH | split row (char esep) | prepend "/opt/bin" | uniq)
```

- Reassign needs the same kind: `let` rebinds (shadows) in a new scope; `mut` reassigns in place (`$n += 1`).
- `$env` mutated inside a plain `def` is **discarded on return** — see §11 `--env`.
- `unlet x` removes a binding (0.110+); `hide-env NAME` removes an env var.

---

## 4. Pipelines & `$in`

The previous stage's value is `$in`. It is the implicit input to most commands.

```nu
"hello" | str upcase                         # explicit pipe
def total []: list<int> -> int { $in | math sum }   # $in = pipeline input
ls | where type == dir | get name            # table → filtered → column
```

- **`$in` is consumed once.** Using it twice yields empty the second time. Bind first:
  ```nu
  def stats []: list -> record { let xs = $in; {n: ($xs | length), sum: ($xs | math sum)} }
  ```
- Assign a pipeline to a name with parens or in-pipeline `let` (0.110+):
  ```nu
  let big = (ls | where size > 10mb)
  ls | where size > 10mb | let big = $in
  ```

---

## 5. Cell paths & optional access

```nu
$user.address.city            # nested
$rows.0.name                  # index then field
(ls).0.name                   # PARENS required on command output — `ls.0` is a parse error
$user.middle?                 # `?` → null instead of erroring on missing
$rows.name?.0?                # chain optionals
get -o address.city           # `-o`/`--optional` form of `get`
```

`get` vs `select`: `get name` → the column's values (unwrapped); `select name age` → a narrower table/record (keeps shape).

---

## 6. The core command vocabulary (80/20)

| Command | Does | Shape |
|---|---|---|
| `where COND` | filter rows | row-condition or `{\|r\| …}` |
| `each {\|x\| … }` | map (returns a stream/list) | list → list |
| `par-each {\|x\| … }` | parallel map (order preserved) | list → list |
| `filter {\|x\| … }` | map-style filter (closure) | list → list |
| `reduce -f INIT {\|it, acc\| … }` | fold | list → value |
| `select COLS` / `reject COLS` | keep / drop columns | table → table |
| `get COL` | pull column values | table → list |
| `update COL {\|r\| … }` | replace a field | table → table |
| `insert COL {\|r\| … }` | add a new field | table → table |
| `upsert COL {\|r\| … }` | update-or-insert | table → table |
| `merge $rec` | shallow-merge records | record → record |
| `sort-by COL` / `uniq` / `reverse` | order / dedupe | table → table |
| `group-by COL` / `transpose` | reshape | table ↔ record |
| `flatten` / `wrap NAME` | nest ↔ flat; value → 1-col table | |
| `enumerate` / `zip $other` | pair with index / another list | |
| `first N` / `last N` / `skip N` / `take N` | slice | |
| `length` / `is-empty` / `compact` | count / test / drop nulls | |
| `append` / `prepend` | grow a list | |
| `math sum\|avg\|max\|min` | aggregate | list → value |
| `default VAL COL?` | fill missing | |

```nu
# canonical: map+filter+aggregate without a single loop
ls **/*.rs | where size > 0b | select name size | sort-by size | last 5
[1 2 3 4] | reduce -f 0 {|it, acc| $acc + $it }          # => 10
$cfg | upsert retries 3 | merge {timeout: 30sec}
```

---

## 7. Strings, interpolation, parsing

```nu
$"user ($user.name) has ($items | length) items"   # () for any expression
$"plain $simplevar still interpolates"              # bare var ok; () is the safe default
"a,b,c" | split row ","                             # → [a b c]
"  hi " | str trim
"v1.2.3" | parse "v{maj}.{min}.{patch}"             # template → table of named cols
"Volume: 0.50" | parse -r 'Volume: (?P<v>[0-9.]+)' | get v.0 | into float
"deadbeef" | str substring 0..6 | into int --radix 16
[a b c] | str join "-"                              # NOT `str collect` (removed)
```

---

## 8. Control flow (all expressions)

```nu
let sign = (if $n > 0 { "pos" } else if $n < 0 { "neg" } else { "zero" })

match $code {
  200 => "ok",
  400 | 404 => "client-error",          # or-pattern
  $c if $c >= 500 => "server-error",    # guard
  {status: $s, ..} => $"status ($s)",   # record destructure + rest
  [$first, ..$rest] => $first,          # list destructure
  _ => "unknown",
}

for f in (ls).name { print $f }         # side-effect loop — the escape hatch
```

Prefer `each`/`match` over `for`/`if`-chains. `for` builds nothing (good for pure side effects); `each` always returns a list — append `| ignore` if you only wanted the effect.

---

## 9. Defining commands

```nu
def greet [
  name: string                 # required positional
  greeting: string = "hi"      # optional with default
  --loud                       # boolean flag → $loud
  --count (-c): int = 1        # typed flag with short alias
  ...rest: string              # rest args → list
]: nothing -> string {
  let msg = $"($greeting), ($name)"
  if $loud { $msg | str upcase } else { $msg }
}
```

- `def --env` — function's `$env`/`cd` mutations **persist to caller** (required for any setter, see §11).
- `def --wrapped name [...rest] { ^tool ...$rest }` — pass unknown flags straight through to an external.
- Subcommands are space-named: `def "git changed" [] { ^git status -s }`.

---

## 10. Closures as data (higher-order house pattern)

Closures are first-class values you pass to commands or store. This is the `scripts/_shared.nu` idiom:

```nu
# run a closure, capture stdout trimmed; stderr discarded
export def capture [code: closure]: nothing -> string {
  (do $code | complete).stdout | str trim
}
# fire-and-forget: discard stdout, stderr, and exit code
export def run_silent [code: closure] { do $code | complete | ignore }

capture { ^wpctl get-volume @DEFAULT_AUDIO_SINK@ }
run_silent { ^swayosd-client --output-volume raise }
```

`do $closure` invokes it; `do --ignore-errors $c` swallows failures; `do --env $c` lets it mutate env.

---

## 11. Env & path (the `--env` trap)

```nu
def --env activate [dir: path]: nothing -> nothing {
  cd $dir                                  # cd is env — needs --env to persist
  $env.PROJECT = ($dir | path basename)
}
load-env {API_KEY: "x", REGION: "eu"}      # bulk-set from a record
$env.PATH = ($env.PATH | prepend ($env.HOME | path join ".local/bin") | uniq)
```

Path helpers: `path join`, `path parse` (→ `{parent, stem, extension}`), `path expand`, `path exists`, `path basename`, `path type`.

---

## 12. Errors

```nu
try { 1 / 0 } catch {|err| $err.msg }       # catch binds the error record
try { risky } catch { "fallback" } 
# 0.111+: finally always runs (even on early return / error)
try { open f } catch {|e| print -e $e.msg } finally { print "done" }

error make {msg: "invalid input"}            # raise a structured error
error make {                                 # with a source span → pretty underline
  msg: "out of range"
  label: {text: "here", span: (metadata $n).span}
}
```

**External failure aborts the pipeline.** To inspect instead of abort, use `complete`:

```nu
let r = (do { ^git push } | complete)        # → {stdout, stderr, exit_code}
if $r.exit_code != 0 { print -e $r.stderr }
```

---

## 13. External commands

```nu
^ls -la                       # ^ forces the external when a built-in shadows it
git status                    # plain name is fine when nothing shadows it
run-external "ffmpeg" "-i" $src $dst     # programmatic, args as a list
^cmd ...$args | complete      # spread args; capture result
^cmd o> out.log e> err.log    # redirect stdout / stderr
^cmd | from json | get field  # parse external text into structure at the edge
```

---

## 14. Data formats

```nu
open config.toml              # auto-parses by extension → record/table
open --raw notes.txt          # bytes/string, no parse
$data | to json -r            # -r = compact (raw), no pretty indent
'{"a":1}' | from json | get a
ls | to csv | save -f out.csv
$rec | to nuon                # nuon = nushell's native literal format
```

Round-trippers: `from`/`to` `json` `yaml` `toml` `csv` `tsv` `xml` `nuon`. `open`/`save` infer from extension; `save -f` overwrites.

---

## 15. Modules, scripts, `main`

```nu
# scripts/_shared.nu — export helpers
export def status [text: string, tooltip: string, class: string]: nothing -> string {
  {text: $text, tooltip: $tooltip, class: $class} | to json -r
}

# scripts/volume.nu — a script
#!/usr/bin/env nu
use _shared.nu *                # pull every export (or: use scripts/_shared.nu *)

def state []: nothing -> record {           # tiny typed helper
  let raw = (capture { ^wpctl get-volume @DEFAULT_AUDIO_SINK@ })
  { pct: ($raw | parse -r 'Volume: (?P<v>[0-9.]+)' | get v.0 | into float | $in * 100 | math round | into int)
    muted: ($raw | str contains "MUTED") }
}

def main [--get --up --down --set: int]: nothing -> nothing {   # dispatch by flag
  if $up        { run_silent { ^wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%+ } }
  else if $down { run_silent { ^wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%- } }
  else if $set != null { run_silent { ^wpctl set-volume @DEFAULT_AUDIO_SINK@ $"($set)%" } }
  else          { state | get pct | print }    # default branch = --get
}
```

- A file with `def main` is runnable: `nu volume.nu --up`. Optional flags default to `null` — branch on `!= null`, not truthiness.
- Subcommand scripts: `def "main up" []` / `def "main down" []` → `nu vol.nu up`.

---

## 16. Tooling (this repo's stack)

| Need | Tool | Invocation |
|---|---|---|
| Format | `nufmt` | `nufmt --stdin` (stdin→stdout; helix formatter) |
| LSP / diagnostics | nushell built-in | `nu --lsp` |
| Parse-check a file | nushell | `nu --ide-check 0 script.nu` |
| Run with stricter errors | nushell | `nu --no-config-file script.nu` |

---

## 17. Gotchas (the traps that cause wrong output)

```nu
# ❌ mut captured by a closure
mut x = 0
[1 2 3] | each { $x += 1 }
# => Error: nu::parser::expected_keyword
# =>   × Capture of mutable variable.
# ✅ fold instead
[1 2 3] | reduce -f 0 {|it, acc| $acc + 1 }
```
**Lesson:** never mutate outer state from `each`/`where`/`par-each`. Use `reduce`, or build a list and aggregate.

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

```nu
# ❌ env/cd lost after the function returns
def goto [d: path] { cd $d }        # caller's PWD unchanged
# ✅ mark the function env-mutating
def --env goto [d: path] { cd $d }
```
**Lesson:** `cd` and `$env.*` need `def --env` to escape the function.

```nu
# ❌ a failing external kills the pipeline
^grep missing file.txt | lines     # nonzero exit aborts everything
# ✅ capture and branch
let r = (do { ^grep missing file.txt } | complete)
if $r.exit_code == 0 { $r.stdout | lines } else { [] }
```
**Lesson:** wrap fallible externals in `do { } | complete`.

One-line traps:
- **`str collect` / `build-string` are removed** — use `str join` and `$"..."`.
- **`let-env X = …` is removed** — assign `$env.X = …`.
- **`ls.name` is a parse error** — parenthesize command output: `(ls).name` or `ls | get name`.
- **`each` returns a list even when you wanted only side effects** — append `| ignore` or use `for`.
- **`$in` reads once** — bind `let xs = $in` if you need it again.
- **Optional flag omitted = `null`, not `false`** — test `--set` with `$set != null`.
- **`reduce` element comes first, accumulator second**: `{|it, acc| …}` with `-f INIT`.
- **`where size > 1mb` is a row-condition, not a closure** — the closure form is `where {|r| $r.size > 1mb}`; don't mix.
- **`source`/`use` need parse-time-known paths** — use `const`, never a `let`/runtime string.
- **`save` won't overwrite** without `-f`; **`to json`** pretty-prints unless `-r`.

---

## 18. Cheat sheet (20% used 80%)

```nu
let x = 5                          mut n = 0          const C = "f.nu"
$env.K = "v"                       $env.PATH = ($env.PATH | prepend "/x" | uniq)

# pipeline data plumbing
ls | where type == dir | select name size | sort-by size | last 5
$t | get col       $t | update col {|r| $r.col + 1 }      $t | upsert col 0
$t | reject secret      $t | group-by status      $t | transpose k v
[1 2 3] | each {|x| $x * 2 }       [1 2 3] | reduce -f 0 {|it, acc| $acc + $it }
$r.field?  | default 0             $list | enumerate | each {|e| $"($e.index): ($e.item)" }

# strings
$"hi ($name)"      "a,b" | split row ","      "x=1" | parse "{k}={v}"
"  s " | str trim       [a b] | str join "-"       $s | into int

# control flow (expressions)
let y = (if $c { 1 } else { 2 })
match $x { 1 => "one", _ if $x > 9 => "many", _ => "few" }

# defs
def f [a: int, --flag, --n: int = 1]: int -> int { $in + $a }
def --env setup [] { $env.READY = true }
def main [--up --down] { if $up { … } else { … } }

# closures / externals / errors
do { ^cmd ...$args } | complete            # {stdout, stderr, exit_code}
try { risky } catch {|e| $e.msg } finally { … }
error make {msg: "bad"}

# data
open f.json | get k      $x | to json -r      ls | to csv | save -f out.csv
```
