# [[just]] — the unstable frontier

> [!abstract] Purpose
> Everything in `just` 1.57.0 that requires `set unstable`: the `lists` type system (1.53), user-defined functions (1.49), cached recipes via `[cache]` (1.54), and the `eager` keyword (1.47). These change in backwards-incompatible ways between minor releases, so they are isolated here — when `just` is upgraded, this is the file to re-verify first.

## 📥 Inputs

- **Context:** a justfile that has opted in with `set unstable`, `just --unstable`, or `JUST_UNSTABLE=1` in the environment.
- **Constraints:** requires just ≥ 1.53 for lists, ≥ 1.54 for `[cache]`, ≥ 1.49 for user-defined functions. `[cache]` additionally requires the recipe to be a **script recipe** (`[script]` or a `#!` shebang). Because `JUST_UNSTABLE` is inherited by child processes, setting it in the environment silently enables unstable features in nested `just` invocations; `--unstable` does not propagate.
- **Anti-use:** don't use any of this in a justfile that other people or CI depend on staying stable across a `just` upgrade, and don't reach for `[cache]` as a substitute for a real build system — it is a hash-comparison heuristic, not a dependency graph.

## 📤 Outputs

- **Result:** list-typed values with real booleans and negation, reusable expression-level functions, and recipes that skip execution on a cache hit.
- **Side effects:** `[cache]` creates a `.justcache/` directory beside the justfile containing `<BLAKE3-HASH>.json` entries. **Git-ignore it.** Cache entries take file locks, so concurrent `just` processes are safe.

## ⛓️ Workflow

```just
set unstable
set lists

FILES := ["lib.c", "main.c"]

double(n) := n + n                     # user-defined function

[script]
[cache(inputs = FILES, outputs = "main")]
build:
    cc {{ join_list(FILES, " ") }} -o main

clean:
    rm -f main                         # deleting an output forces `build` to re-run
```

## 📋 Core invariants

1. **Unstable features fail loudly, never silently.** Each one aborts with a message naming the gate. A justfile that parses without `set unstable` is using nothing from this file.
2. **`[cache]` only works on script recipes.** A plain shell recipe with `[cache]` is a hard error — combine it with `[script]` or a shebang.
3. **The canonical false value is the empty list `[]`, not `""`.** Under `set lists`, *every* value other than `[]` is truthy, **including the empty string**. This inverts intuition carried over from shell.
4. **Lists never nest.** List literals flatten their arguments: `[["a","b"], [], "c"]` evaluates to `["a","b","c"]`.
5. **`++` concatenates lists; `+` and `/` distribute.** A string combined with a non-empty list applies elementwise; two equal-length lists combine pairwise; different lengths is an error.
6. **Most built-ins reject lists.** Only the functions enumerated below have been taught about them. Use `join_list()` to feed a list to an un-upgraded function.
7. **Cache keys capture less than you think.** Time, system binaries, OS version, databases, and the network are all outside the key. Correctness of skipping is the author's responsibility, not `just`'s.
8. **`outputs` are not part of the cache key**, but all of them must exist for a skip, and their absence after a successful run is an error.

## ⚠️ Gotchas

```just
# ❌ unstable feature without the gate
set lists
# error: the `lists` setting is currently unstable, invoke `just` with `--unstable`,
# set the `JUST_UNSTABLE` environment variable, or add `set unstable` to your
# `justfile` to enable unstable features
# ✅
set unstable
set lists
```

```just
# ❌ user-defined function without the gate
hello(n) := f"hi {{n}}"
# error: user-defined functions are currently unstable, invoke `just` with `--unstable`,
# set the `JUST_UNSTABLE` environment variable, or add `set unstable` to your
# `justfile` to enable unstable features
```

```just
# ❌ [cache] on a plain shell recipe
set unstable
[cache]
r:
    echo hi
# error: shell recipe `r` has script recipe attribute `cache`
#  ——▶ justfile:3:1
# ✅ make it a script recipe
set unstable
[script]
[cache]
r:
    echo hi
```
**Cause:** caching hashes one script body and one executor, which a per-line shell recipe doesn't have. **Fix:** add `[script]`, or start the body with a shebang.

```just
# ❌ assuming the empty string is falsy
set unstable
set lists
x := ''
r:
    @echo {{ if x { "truthy" } else { "falsy" } }}
# prints: truthy   — '' is NOT false; only [] is
# ✅ normalize first
r:
    @echo {{ if bool(x) { "truthy" } else { "falsy" } }}
```

```just
# ❌ which() before enabling lists
tool := which("fd")
# error: the `which` function is currently unstable ... requires `set lists`
# ✅ enable lists, or use require() when absence should abort
```

- **`just --clean` reports what it removed** — `removed 1 cache entry` — and the next invocation runs for real. `--no-cache` bypasses the cache without clearing it.
- **`just -vv` prints the full cache key object to stderr**, which is the only practical way to find out why a recipe missed.
- **`uuid()`, `datetime()`, and `choose()` inside a cached recipe's body** guarantee a miss on every run, because the evaluated body is part of the key.
- **`set lists` changes `positional-arguments` behavior** — list arguments are space-joined unless the parameter is variadic, in which case each element becomes one positional argument.
- **Under lists, `if` may omit `else`**, evaluating to `[]` when false. That silently changes the meaning of existing conditionals if they relied on a stringly-typed fallback.

## 📝 Cheat sheet

```just
set unstable                                  # or: just --unstable / JUST_UNSTABLE=1
set lists

xs := ["a", "b"]          ys := xs ++ ["c"]        # literal, concat
n  := len(ys)             s  := join_list(ys, ",") # 3, "a,b,c"
parts := split("a:b:c", ":")                       # ["a","b","c"];  split(s,'') → chars
b  := bool(env('FLAG', '0'))                       # "" "0" "false" [] → [];  "1" "true" → "true"
t  := show(xs)                                     # literal representation, for debugging
!x        x =~ res        x !~ res                 # negation, any-match, none-match

f(a, b) := a + "-" + b                             # user-defined function

[script]
[cache(inputs = ["src/main.c"], outputs = "bin/app", extra = VERSION)]
build:
    cc src/main.c -o bin/app

just --no-cache R      just --clean       just --clean R      just -vv R
```

---

## 1. Lists (1.53)

Enabled with `set lists`. Values may be lists of strings instead of only strings.

**Literals and structure**
- `["a", "b", "c"]`; literals flatten, so lists never contain lists.
- Lists in recipe interpolations and f-strings are **joined with spaces** into one string.
- Variadic recipe parameters become lists rather than pre-joined strings.
- A parameter evaluates to its default when the argument is the empty list. Passing `[]` to a non-`*` parameter without a default is an error.

**Booleans** — the model most likely to surprise:
- Canonical true is the string `"true"`; canonical false is the empty list `[]`.
- **Everything except `[]` is truthy, including `''`.**
- `!expr` yields `"true"` when `expr` is `[]`, otherwise `[]`.
- `==`, `!=`, `=~`, `!~` may be used anywhere, not only in `if` and `assert()`, and evaluate to `"true"` or `[]`.
- `value =~ regexes` is true if any element matches any regex; false if either side is empty. `!~` is true if none match, and true if either side is empty.
- The `else` branch of `if` may be omitted, yielding `[]`.

**Operators**
| Operator | Behavior with lists |
|---|---|
| `++` | list concatenation |
| `+`, `/` | string + non-empty list → elementwise; two equal-length lists → pairwise; unequal lengths → error |

**Dependencies** — `*(recipe *argument)` invokes a dependency once per list element. Each argument binds to exactly one parameter; extra arguments to a variadic dependency are an error.

**List-aware functions**
| Function | Behavior |
|---|---|
| `len(value)` | element count |
| `join_list(value, sep)` | join into one string — the bridge to un-upgraded functions |
| `split(string, sep)` | split into a list; `split(s, '')` splits into characters (1.57) |
| `bool(value)` | `[]` for `""`, `"0"`, `"false"`, `[]`; `"true"` for `"1"`, `"true"`; anything else errors |
| `show(value)` | literal representation, for debugging |
| `env(keys, default)` | check each name in `keys`, falling back to `default` |
| `which(name)` | empty list when not found — this is why it needs lists |
| `is_dependency()`, `path_exists()`, `semver_matches()` | return canonical booleans instead of `"true"`/`"false"` strings |
| `absolute_path()`, `append()`, `prepend()`, `quote()` | applied per element; `append`/`prepend` no longer split on whitespace |
| `assert(cond, msg)` | evaluates to `cond`; message elements are space-joined for display |

**Settings and attributes under lists**
- `shell`, `windows-shell`, and `script-interpreter` flatten their elements like list literals.
- `dotenv-filename` and `dotenv-path` accept lists, loading several environment files; `dotenv-path` values are tried first, and later files win. `--dotenv-filename` / `--dotenv-path` may be passed repeatedly.
- Each element of `set dotenv-command` runs as a command, later commands winning.
- `[arg(flag)]` makes a parameter a valueless flag: `"true"` when passed, `[]` otherwise. Flag parameters may not have a default.
- `[arg(multiple)]` collects repeated occurrences into a list.
- `[arg(min=N)]` / `[arg(max=N)]` (1.56) bound the count.
- `[arg(pattern)]` and `[arg(help)]` accept lists — any-match and space-joined respectively; an empty pattern list accepts anything.
- `[env(NAME, [])]` leaves the variable unset; otherwise the value is space-joined.

Upstream is explicitly soliciting feedback on list semantics; expect churn.

## 2. User-defined functions (1.49)

```just
set unstable

base := "foo"
join(extension) := base + "." + extension     # may reference assignments in the same module

hello(name) := f"Hello, {{ name }}!"

create:
    touch {{ join("c") }} {{ join("html") }}
    echo '{{ hello("World") }}'
```

Definitions are expression-level, not recipes: one expression, no body, no side effects. They see assignments in the same module only.

## 3. Cached recipes (1.54)

`[cache]` skips an invocation when a matching entry exists. **Script recipes only.**

**The cache key** is a JSON object hashed with BLAKE3; the entry lives at `.justcache/<HASH>.json`. Keys:

| Field | Populated |
|---|---|
| `body` | automatically — the evaluated recipe body |
| `environment` | automatically — environment variable names and values |
| `executor` | automatically — script interpreter or shebang |
| `extension` | automatically — script file extension |
| `inputs` | from `[cache(inputs = FILES)]` — path → content hash |
| `positional` | automatically — positional arguments |
| `recipe` | automatically — `::`-separated module path |
| `working_directory` | automatically |
| `extra` | from `[cache(extra = EXPRESSION)]` — arbitrary, evaluated with recipe arguments in scope |

`inputs` and `outputs` are expressions evaluated with recipe arguments in scope; paths may be absolute or relative to the recipe's working directory. **Outputs are not part of the key**, but all must exist for a skip, and a successful run that fails to produce one is an error — which is what makes `clean` correctly force a rebuild.

```just
set unstable
set lists

[script]
[cache(inputs = ["lib.c", "main.c"], outputs = "main")]
build:
    cc lib.c main.c -o main

clean:
    rm -f main
```

Mechanics: `just` builds the key, hashes it, and looks for the entry. Non-empty entry → skip. Missing or empty → run, then write `{}`. File locks make concurrent execution safe: the second process blocks, then sees a non-empty entry and skips.

Control: `--no-cache` bypasses entirely; `just --clean [RECIPE…]` clears entries, optionally filtered by recipe or module path (`just --clean bar::bob`); `just -vv` prints cache key objects to stderr.

Upstream's own caveat is worth repeating: skipping based on crude heuristics has a long and sordid history, and the key captures nothing about time, system binaries, OS version, databases, or the network.

## 4. `eager` (1.47)

Counterpart to `set lazy`. Forces evaluation of an unused assignment that lazy evaluation would otherwise skip. Made unstable in 1.47.1 shortly after introduction — treat as provisional *(unverified: not exercised against 1.57.0)*.

## 5. Stability policy

`just` promises **no 2.0**: backwards-incompatible changes are opt-in per justfile, and recipes written for any release since 1.0 keep working. That guarantee explicitly does **not** extend to the features in this file, which is the entire reason they sit behind a gate.

Check what a given binary considers unstable with `just --unstable --dump` on a file that uses the feature, or read the "Currently unstable" markers in the manual's Attributes and Settings tables.

## Connections

- Parent: [[just]] [[skill]] — [SKILL.md](SKILL.md)
- `[cache]`, `set lists`, `set lazy` rows: [attributes-settings.md](attributes-settings.md)
- Stable function catalog: [functions.md](functions.md)

## 🔄 Provenance

Transcribed from the upstream Programmer's Manual sections "Lists", "User-defined functions", "Cached Recipes" (Friendly Admonitions / Implementation / Clearing the Cache / Input Files / Output Files) at just **1.57.0**, verified 2026-07-28.

Reproduced against a local 1.57.0 binary: all three gate error messages; `[cache]` rejecting a plain shell recipe; a `[script] [cache]` recipe skipping on second invocation and producing `.justcache/<hash>.json`; `just --clean` reporting `removed 1 cache entry` and forcing a re-run; `set lists` with `++`, `len()`, and `join_list()`.

Not verified: `eager`, `[cache(outputs)]` error-on-missing, `*(recipe *argument)` fan-out, and the dotenv list-loading precedence *(unverified — documented from the manual only)*.

**This is the file to re-verify first on any `just` upgrade.** Upstream is actively soliciting design feedback on lists (tracking issue linked from the manual), so semantics here may change between minor releases without a major-version bump.
