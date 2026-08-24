# [[nushell]] language reference

> [!abstract] Purpose
> The full Nushell 0.114 syntax surface: value types, variables/env,
> pipelines, cell paths, the core command vocabulary, strings, control flow,
> `def`, closures, errors, externals, data formats, and the modules/`main`
> pattern. Loaded from [SKILL.md](SKILL.md) when a task needs actual syntax,
> not just the mental model or top gotchas.

## 📥 Inputs

- **Context:** any `.nu` file or REPL session, Nushell **0.114**
  (tested 0.114.1).
- **Constraints:** breaking changes exist between minors (see each section's
  version notes below); a claim not tagged with a version applies at least
  back to 0.110.
- **Anti-use:** not for the Polars dataframe surface (`polars *`) or the
  `idx` indexing/search family — separate facets, not mined here.

## 📤 Outputs

- **Result:** correct syntax for a given value type, command, or control-flow
  construct.
- **Side Effects:** none — this file is read-only reference.

## ⛓️ Workflow

Look up the topic by section, copy the pattern, adapt names. For anything
ambiguous, `nu --lsp` and `nu --ide-check 0 file.nu` are the ground truth.

---

## 1. Values & literals

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
| `semver` (0.114+) | `'1.2.3' \| into semver` | custom type; comparable, sortable |
| `nothing` | `null` | absence; `is-empty` / `is-not-empty` |

```nu
[...$a ...$b]                 # spread lists
{...$base, role: "admin"}     # spread + override records
^cmd ...$args                 # spread into external args
```

Float ranges use fractional steps by default (0.114+): `0.1..0.3` yields
`0.1, 0.2, 0.3`, not just `0.1`.

## 2. Variables, constants, env

```nu
let x = 10                    # immutable, scoped
mut n = 0                     # mutable — same scope only, NOT closure-capturable
const FILE = "lib.nu"         # parse-time; required by `source`/`use`
$env.API_URL = "https://…"    # set env (string-ish; nushell coerces)
$env.PATH = ($env.PATH | split row (char esep) | prepend "/opt/bin" | uniq)
```

- Reassign needs the same kind: `let` rebinds (shadows) in a new scope;
  `mut` reassigns in place (`$n += 1`).
- `$env` mutated inside a plain `def` is **discarded on return** — see §10
  `--env`.
- `unlet x` removes a binding; `hide-env NAME` removes an env var.
- **0.114+:** `let` bindings are now typed from the pipeline input they
  follow (`42 | let x` gives `$x: int`, checkable via `scope variables`),
  and by default (`enforce-runtime-annotations` opt-out) a type-annotated
  `let` is checked at runtime, not just parse time.

## 3. Pipelines & `$in`

The previous stage's value is `$in`. It is the implicit input to most
commands.

```nu
"hello" | str upcase                                # explicit pipe (see §6: `str uppercase` preferred, 0.114+)
def total []: list<int> -> int { $in | math sum }   # $in = pipeline input
ls | where type == dir | get name                   # table → filtered → column
```

- **`$in` is consumed once.** Using it twice yields empty the second time.
  Bind first:
  ```nu
  def stats []: list -> record { let xs = $in; {n: ($xs | length), sum: ($xs | math sum)} }
  ```
- Assign a pipeline to a name with parens or in-pipeline `let`:
  ```nu
  let big = (ls | where size > 10mb)
  ls | where size > 10mb | let big = $in
  ```
- **0.114+:** `$in` is now typed from the surrounding pipeline's input type,
  so a type mismatch (e.g. `$in + "foo"` when `$in` is `int`) is caught at
  **parse time** instead of surfacing only at runtime.

## 4. Cell paths & optional access

```nu
$user.address.city            # nested
$rows.0.name                  # index then field
(ls).0.name                   # PARENS required on command output — `ls.0` is a parse error
$user.middle?                 # `?` → null instead of erroring on missing
$rows.name?.0?                # chain optionals
get -o address.city           # `-o`/`--optional` form of `get`
```

`get` vs `select`: `get name` → the column's values (unwrapped);
`select name age` → a narrower table/record (keeps shape).

## 5. Core command vocabulary (80/20)

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
| `append` / `prepend` | grow a list (`append` takes multiple rest args, 0.114+) | |
| `math sum\|avg\|max\|min\|cbrt` | aggregate (`cbrt` added 0.114) | list → value |
| `default VAL COL?` | fill missing | |
| `union` / `intersect` / `difference` (0.114+) | dedup'd set ops vs another list | list → list |
| `combinations K` / `permutations` (0.114+) | lazily streamed combinatorics | list → list\<list\> |

```nu
# canonical: map+filter+aggregate without a single loop
ls **/*.rs | where size > 0b | select name size | sort-by size | last 5
[1 2 3 4] | reduce -f 0 {|it, acc| $acc + $it }          # => 10
$cfg | upsert retries 3 | merge {timeout: 30sec}
[1 2 3 4] | union [3 4 5 6]                              # => [1 2 3 4 5 6]
```

## 6. Strings, interpolation, parsing

```nu
$"user ($user.name) has ($items | length) items"   # () for any expression
$"plain $simplevar still interpolates"              # bare var ok; () is the safe default
"a,b,c" | split row ","                             # → [a b c]
"  hi " | str trim
"v1.2.3" | parse "v{maj}.{min}.{patch}"             # template → table of named cols
"Volume: 0.50" | parse -r 'Volume: (?P<v>[0-9.]+)' | get v.0 | into float
"deadbeef" | str substring 0..6 | into int --radix 16
[a b c] | str join "-"                              # NOT `str collect` (removed)
"hi" | str uppercase        "HI" | str lowercase    # 0.114+ names
"hi" | str upcase           # still works, deprecation warning — migrate to `str uppercase`
```

## 7. Control flow (all expressions)

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

Prefer `each`/`match` over `for`/`if`-chains. `for` builds nothing (good for
pure side effects); `each` always returns a list — append `| ignore` if you
only wanted the effect.

**0.114+:** `if`/`match` are now properly typed — their output type is the
union of all branch output types, and a branch set without a fallback
(`if` with no `else`, `match` with no wildcard) includes `nothing` in that
union, since the "no branch matched" case is real.

## 8. Defining commands

```nu
def greet [
  name: string                 # required positional
  greeting: string = "hi"      # optional with default
  --loud                       # boolean flag → $loud
  --count (-c): int = 1        # typed flag with short alias
  ...rest: string              # rest args → list
]: nothing -> string {
  let msg = $"($greeting), ($name)"
  if $loud { $msg | str uppercase } else { $msg }
}
```

- `def --env` — function's `$env`/`cd` mutations **persist to caller**
  (required for any setter, see §11).
- `def --wrapped name [...rest] { ^tool ...$rest }` — pass unknown flags
  straight through to an external.
- Subcommands are space-named: `def "git changed" [] { ^git status -s }`.
- **0.114+:** the POSIX `--` end-of-options delimiter works on built-ins,
  custom commands, and `--wrapped` commands. Everything after `--` is a
  positional operand, even if it starts with `-`:
  ```nu
  greet -- -Alice        # "-Alice" is a positional, not an unknown flag
  ```
- **0.114+ typing:** an optional param/flag with no default now types as
  `oneof<T, nothing>` (not just `T`) since it can genuinely be `null`; with a
  default it's plain `T`.

## 9. Closures as data (higher-order house pattern)

Closures are first-class values you pass to commands or store. This is the
`_shared.nu` idiom:

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

`do $closure` invokes it; `do --ignore-errors $c` swallows failures;
`do --env $c` lets it mutate env.

## 10. Env & path (the `--env` trap)

```nu
def --env activate [dir: path]: nothing -> nothing {
  cd $dir                                  # cd is env — needs --env to persist
  $env.PROJECT = ($dir | path basename)
}
load-env {API_KEY: "x", REGION: "eu"}      # bulk-set from a record
$env.PATH = ($env.PATH | prepend ($env.HOME | path join ".local/bin") | uniq)
```

Path helpers: `path join`, `path parse` (→ `{parent, stem, extension}`),
`path expand`, `path exists`, `path basename`, `path type`.

## 11. Errors

```nu
try { 1 / 0 } catch {|err| $err.msg }       # catch binds the error record
try { risky } catch { "fallback" }
try { open f } catch {|e| print -e $e.msg } finally { print "done" }  # finally always runs

error make {msg: "invalid input"}            # raise a structured error
error make {                                 # with a source span → pretty underline
  msg: "out of range"
  label: {text: "here", span: (metadata $n).span}
}
```

**0.114+:** the error record passed to `catch` no longer has a `json`
field — a `details` field replaces it, holding the same info without needing
`from json`. Error labels also gained a `location` field (`{file, start,
end}`, offsets relative to that file) alongside the existing `span`.

**External failure aborts the pipeline.** To inspect instead of abort, use
`complete`:

```nu
let r = (do { ^git push } | complete)        # → {stdout, stderr, exit_code}
if $r.exit_code != 0 { print -e $r.stderr }
```

## 12. External commands

```nu
^ls -la                       # ^ forces the external when a built-in shadows it
git status                    # plain name is fine when nothing shadows it
run-external "ffmpeg" "-i" $src $dst     # programmatic, args as a list
^cmd ...$args | complete      # spread args; capture result
^cmd o> out.log e> err.log    # redirect stdout / stderr
^cmd | from json | get field  # parse external text into structure at the edge
```

## 13. Data formats

```nu
open config.toml              # auto-parses by extension → record/table
open --raw notes.txt          # bytes/string, no parse
$data | to json -r            # -r = compact (raw), no pretty indent
'{"a":1}' | from json | get a
ls | to csv | save -f out.csv
$rec | to nuon                # nuon = nushell's native literal format
to nuon --pretty              # 0.114+: aligns table columns, shorthand for --indent 2
```

Round-trippers: `from`/`to` `json` `yaml` `toml` `csv` `tsv` `xml` `nuon`
`kdl` (KDL v2, added 0.114). `open`/`save` infer from extension; `save -f`
overwrites.

SemVer (0.114+, its own type, not a string):

```nu
'1.2.3' | into semver | semver bump minor      # => 1.3.0
'1.2.3' | into semver | $in in ('>=1.0.0' | into semver-range)   # => true
['2.0.0' '1.0.0' '1.2.3'] | each { into semver } | sort
```

## 14. Modules, scripts, `main`

```nu
# _shared.nu — export helpers
export def status [text: string, tooltip: string, class: string]: nothing -> string {
  {text: $text, tooltip: $tooltip, class: $class} | to json -r
}

# volume.nu — a script
#!/usr/bin/env nu
use _shared.nu *                # pull every export

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

- A file with `def main` is runnable: `nu volume.nu --up`. Optional flags
  default to `null` — branch on `!= null`, not truthiness.
- Subcommand scripts: `def "main up" []` / `def "main down" []` →
  `nu vol.nu up`.
- **Breaking, 0.114:** importing a module no longer implicitly imports its
  exported sub-modules:
  ```nu
  export module foo {
    export def bar [] {}
    export module sub { export def baz [] {} }
  }
  use foo
  foo bar      # valid
  foo sub baz  # invalid now — `sub` isn't implicitly imported
  ```
  Fix: re-export it explicitly — `export use sub` inside `foo` — to keep the
  old behavior.
- **New, 0.114:** `run` lets a *whole script* act as one pipeline stage,
  isolated from the caller's scope:
  ```nu
  "Hello Nushell!" | run shout.nu | str camel-case
  ```
  A bare script (no `main`) is evaluated as a pipeline transform on `$in`; a
  script with `def main` has `run` invoke that entry point instead.

## 15. Tooling (this repo's stack)

| Need | Tool | Invocation |
|---|---|---|
| Format | `nufmt` | `nufmt --stdin` (stdin→stdout; helix formatter) |
| LSP / diagnostics | nushell built-in | `nu --lsp` |
| Parse-check a file | nushell | `nu --ide-check 0 script.nu` |
| Run with stricter errors | nushell | `nu --no-config-file script.nu` |
| Run a script as a pipeline stage (0.114+) | nushell | `... | run script.nu | ...` |

## 📋 Core invariants

1. `get` unwraps to values; `select` keeps table/record shape — pick based
   on whether the next stage needs to stay tabular.
2. A row-condition (`where size > 1mb`) and a closure
   (`where {|r| $r.size > 1mb}`) are two different `where` forms — don't mix
   their syntax.
3. `reduce`'s closure takes `{|it, acc| …}` — element first, accumulator
   second — paired with `-f INIT`.
4. `source`/`use` targets must be known at **parse time**; only `const`
   values qualify, never `let` or a runtime-computed string.
5. Type annotations are now enforced at both parse time and, by default
   (0.114+), runtime for `let` — don't assume an annotation was purely
   documentation.

## ⚠️ Gotchas

```nu
# ❌ command output not parenthesized before indexing
ls.0
# => parse error
# ✅ parens or a pipe
(ls).0
ls | get 0
```

```nu
# ❌ str upcase — deprecated as of 0.114, prints a warning
"hi" | str upcase
# ✅ current name
"hi" | str uppercase
```

```nu
# ❌ negative cell-path index used to give a confusing "Row number too large"
[["foo" "bar"] ["foo" "baz"]] | get 0.-1
# ✅ (0.114+) now reports clearly: "negative index is not supported in cell path"
#     — negative indices in a *cell path* aren't supported at all; slice instead
```

## 📝 Cheat sheet

```nu
$user.address.city          get -o address.city         (ls).0.name
$t | get col       $t | select col1 col2      $t | reject col
[1 2 3] | each {|x| $x * 2 }         [1 2 3] | reduce -f 0 {|it, acc| $acc + $it }
$"hi ($name)"        "a,b" | split row ","        "x=1" | parse "{k}={v}"
def f [a: int, --n: int = 1]: int -> int { $in + $a }
try { risky } catch {|e| $e.details } finally { … }      # `.details`, not `.json` (0.114+)
do { ^cmd } | complete            # {stdout, stderr, exit_code}
open f.toml     $x | to json -r     '1.2.3' | into semver | semver bump patch
```

## Connections

- Uses [[ai-skills|AI Skills Index]]
- Sibling of [SKILL.md](SKILL.md) — see that file for the mental model, top
  gotchas, and dense cross-topic cheat sheet.

## 🔄 Provenance

Same source and refresh history as [SKILL.md](SKILL.md) — see that file's
Provenance section. This file holds the full per-topic syntax that
`SKILL.md` only condenses.
