# [[just]] — functions & constants

> [!abstract] Purpose
> Lookup catalog of every built-in function and constant in `just` 1.57.0: 84 functions across 12 groups, plus 32 predefined constants. Load this when you need a specific built-in by name or want to know whether one exists before shelling out.

## 📥 Inputs

- **Context:** anywhere an expression is legal — `:=` assignments, `{{ }}` interpolations in recipe bodies, f-strings, parameter defaults, conditionals, and most attribute arguments.
- **Constraints:** functions may **not** appear in `set` values (settings are resolved before the machinery functions depend on). Under `set lists` most functions still expect strings; only the ones listed in [unstable.md](unstable.md) accept lists.
- **Anti-use:** don't reach for a function when a shell pipeline is clearer — `just` built-ins are for values needed at *parse/assignment* time. Runtime data manipulation belongs in the recipe body, in nushell.

## 📤 Outputs

- **Result:** a string. Every built-in returns a string, including the "booleans" — `path_exists()` and `is_dependency()` return the literal `"true"` or `"false"`.
- **Side effects:** mostly none. Exceptions that touch the world: `shell()` executes a command, `read()` reads a file, `sha256_file()` / `blake3_file()` hash a file, `require()` aborts if a binary is missing, `uuid()` / `choose()` are nondeterministic, `datetime*()` depend on the clock. Under `--dry-run`, `shell()` commands are **not** run (1.56).

## ⛓️ Workflow

```just
proj    := file_stem(justfile())                    # "myrepo"
dist    := justfile_directory() / "dist"            # `/` joins paths
stamp   := datetime("%F")                           # 2026-07-28
release := if semver_matches(VERSION, ">=1.0.0") == "true" { "stable" } else { "pre" }
cc      := require("clang")                         # absolute path, or abort

banner:
    @echo "{{GREEN}}{{proj}} {{release}} ({{stamp}}){{NORMAL}}"
```

## 📋 Core invariants

1. **Everything returns a string.** There is no number or boolean type outside `set lists`; comparisons yield `"true"` / `"false"` strings, so `semver_matches(...) == "true"` is the idiom.
2. **`require()` aborts, `which()` doesn't.** `require(name)` errors when the binary is absent; `which(name)` returns the path or empty — and `which()` requires `set lists` as of 1.53.
3. **Any `*_directory()` may be written `*_dir()`.** `home_directory()` ≡ `home_dir()`; `invocation_directory_native()` ≡ `invocation_dir_native()`. Verified on 1.57.0.
4. **Prefer the `/` operator over `join()`.** `join()` uses the native separator (`\` on Windows) and can produce mixed paths; `/` always produces forward slashes, which `just` handles correctly on every platform.
5. **`justfile()` and `justfile_directory()` always point at the root**, even inside a submodule. For the current file use `source_file()` / `source_directory()`; for the current module use `module_file()` / `module_directory()`.
6. **`env_var()` and `env_var_or_default()` are deprecated aliases** for `env(key)` and `env(key, default)`. New code uses `env()`.
7. **Regex is the Rust `regex` crate.** No backreferences, no lookaround. `=~`, `!~`, `replace_regex()`, and `[arg(pattern)]` all share that dialect.

## ⚠️ Gotchas

```just
# ❌ treating a "boolean" function as a condition value
x := if path_exists("Cargo.toml") { "rust" } else { "other" }
# This works, but only because the string "true" is compared implicitly —
# ✅ be explicit when composing, since the return is the STRING "true"
x := if path_exists("Cargo.toml") == "true" { "rust" } else { "other" }
```

```just
# ❌ calling a function in a setting
set tempdir := home_directory() / ".cache/just"
# error: expected string literal ... settings may not contain function calls
# ✅ literal only
set tempdir := "/tmp/just"
```

```just
# ❌ join() on Windows silently produces backslashes
p := join("a", "b")     # "a\b" on Windows
# ✅ the `/` operator is portable
p := "a" / "b"          # "a/b" everywhere
```

```just
# ❌ which() without lists enabled
tool := which("fd")
# error: the `which` function is currently unstable ... requires `set lists`
# ✅
set unstable
set lists
tool := which("fd")
# …or, when absence should be fatal:
tool := require("fd")
```
**Cause:** `which()` returns an optional value, which needs the list type to represent emptiness. **Fix:** `require()` when you want the abort anyway.

- **`shell()` is skipped under `--dry-run`** (1.56). A justfile whose control flow depends on `shell()` output will dry-run differently from a real run.
- **`uuid()` and `choose()` break caching and reproducibility** — a variable holding one changes the value of everything derived from it on every invocation.
- **`datetime()` uses `strftime` syntax**, not Rust's `chrono` format names: `datetime("%F")`, not `datetime("YYYY-MM-DD")`.

## 📝 Cheat sheet

```just
os() os_family() arch() num_cpus() num_jobs()            # system
env('K') env('K','default')                              # environment
require('bin')  which('bin')                             # executables (which needs set lists)
shell('cmd $1', arg)                                     # capture stdout
justfile() justfile_directory() source_directory() module_directory() module_path()
invocation_directory() is_dependency() recipe_name() just_version()
a / b   clean(p) absolute_path(p) canonicalize(p)        # paths
extension(p) file_name(p) file_stem(p) parent_directory(p) without_extension(p)
path_exists(p) read(p)                                   # filesystem
replace(s,f,t) replace_regex(s,re,r) trim(s) quote(s) append(suf,s) prepend(pre,s)
uppercase(s) lowercase(s) kebabcase(s) snakecase(s) titlecase(s) uppercamelcase(s)
assert(cond,'msg') error('msg')                          # abort
sha256(s) sha256_file(p) blake3(s) blake3_file(p) uuid() choose(n, HEX)
datetime('%F') datetime_utc('%F') semver_matches(v,'>=1.0')
style('error') style('red', text)                        # terminal styling
home_dir() config_dir() cache_dir() data_dir() runtime_dir()
```

---

## 1. System information

| Function | Since | Returns |
|---|---|---|
| `arch()` | | instruction set: `aarch64`, `arm`, `x86`, `x86_64`, `wasm32`, … |
| `os()` | | `linux`, `macos`, `windows`, `android`, `freebsd`, … |
| `os_family()` | | `unix` or `windows` |
| `num_cpus()` | 1.15 | logical CPU count |
| `num_jobs()` | 1.56 | the value of `--jobs`, or the empty list |

## 2. External commands & environment

| Function | Since | Returns |
|---|---|---|
| `shell(command, args…)` | 1.27 | stdout of `command`, with `args` available as `$1`, `$2`, … |
| `env(key)` | 1.15 | value, aborting if unset |
| `env(key, default)` | 1.15 | value, or `default` |
| `env_var(key)` / `env_var_or_default(key, d)` | | **deprecated** aliases for the two above |

```just
hash := shell('git rev-parse --short $1', "HEAD")
user := env('USER', 'unknown')
```

## 3. Executables

| Function | Since | Returns |
|---|---|---|
| `require(name)` | 1.39 | absolute path from `PATH`, or **abort** |
| `which(name)` | 1.39 | absolute path, or empty — **requires `set lists`** since 1.53 |

Both respect `PATHEXT` on Windows (1.48).

## 4. Invocation information

| Function | Since | Returns |
|---|---|---|
| `invocation_directory()` | | absolute path where the user ran `just` (forward slashes) |
| `invocation_directory_native()` | | same, in native path form |
| `is_dependency()` | | `"true"` when the recipe is running as a dependency |
| `recipe_name()` | 1.53 | name of the current recipe |

## 5. Justfile, source, and module paths

| Function | Since | Returns |
|---|---|---|
| `justfile()` / `justfile_directory()` | | the **root** justfile and its directory, even from a submodule |
| `source_file()` / `source_directory()` | 1.27 | the file currently being evaluated (follows `import`) |
| `module_file()` / `module_directory()` | | the current module's file and directory |
| `module_path()` | 1.50 | `::`-separated path to the current module |

## 6. The just process

| Function | Since | Returns |
|---|---|---|
| `just_executable()` | | absolute path to the `just` binary |
| `just_pid()` | | process ID |
| `just_version()` | 1.55 | version string — pair with `set minimum-version` for hard gating |

## 7. String manipulation

| Function | Since | Effect |
|---|---|---|
| `append(suffix, s)` / `prepend(prefix, s)` | 1.27 | append/prepend to each whitespace-separated part of `s` |
| `encode_uri_component(s)` | 1.27 | percent-encode |
| `quote(s)` | | shell-quote: escape single quotes and wrap |
| `replace(s, from, to)` | | literal replacement |
| `replace_regex(s, regex, replacement)` | | Rust-regex replacement |
| `trim(s)` / `trim_start(s)` / `trim_end(s)` | | strip whitespace |
| `trim_start_match(s, sub)` / `trim_end_match(s, sub)` | | strip one matching affix |
| `trim_start_matches(s, sub)` / `trim_end_matches(s, sub)` | | strip repeatedly |

## 8. Case conversion (all 1.7)

`capitalize` · `kebabcase` · `lowercamelcase` · `lowercase` · `shoutykebabcase` · `shoutysnakecase` · `snakecase` · `titlecase` · `uppercamelcase` · `uppercase`

## 9. Path manipulation

| Function | Since | Effect |
|---|---|---|
| `absolute_path(path)` | | resolve against the working directory |
| `canonicalize(path)` | 1.24 | resolve symlinks and `..`; the path must exist |
| `clean(path)` | | simplify separators and `.` / `..` textually |
| `extension(path)` | | `"txt"` for `/foo/bar.txt` |
| `file_name(path)` / `file_stem(path)` | | `bar.txt` / `bar` |
| `parent_directory(path)` | | parent; a bare filename yields `.` (1.51) |
| `without_extension(path)` | | `/foo/bar` |
| `join(a, b…)` | | native separator — **prefer the `/` operator** |

## 10. Filesystem & errors

| Function | Since | Effect |
|---|---|---|
| `path_exists(path)` | | `"true"` / `"false"` |
| `read(path)` | 1.39 | file contents as a string |
| `assert(CONDITION, MESSAGE)` | 1.27 | abort with `MESSAGE` unless the condition holds; message optional since 1.53 |
| `error(message)` | | abort unconditionally |

## 11. Hashes, UUID, random

| Function | Since | Returns |
|---|---|---|
| `sha256(s)` / `sha256_file(p)` | | hex SHA-256 |
| `blake3(s)` / `blake3_file(p)` | 1.25 | hex BLAKE3 |
| `uuid()` | | random v4 UUID |
| `choose(n, alphabet)` | 1.27 | `n` random characters from `alphabet`, e.g. `choose("32", HEX)` |

## 12. Datetime, semver, style

| Function | Since | Returns |
|---|---|---|
| `datetime(format)` / `datetime_utc(format)` | 1.30 | formatted local / UTC time, `strftime` syntax |
| `semver_matches(version, requirement)` | 1.16 | `"true"` / `"false"` |
| `style(styles)` | 1.37 | escape sequence for `command`, `error`, `warning`, named colors (1.55), or indexed colors `0`–`255` |
| `style(styles, text)` | 1.55 | `text` wrapped in those styles and reset |

## 13. User directories

`cache_directory()` · `config_directory()` · `config_local_directory()` · `data_directory()` · `data_local_directory()` · `executable_directory()` · `home_directory()` · `runtime_directory()` (1.49, unix-only)

All may be abbreviated to `_dir()`.

## 14. Constants (32)

| Group | Names |
|---|---|
| Hex (1.27) | `HEX`, `HEXLOWER`, `HEXUPPER` |
| Paths (1.41) | `PATH_SEP` (`/` · `\`), `PATH_VAR_SEP` (`:` · `;`) |
| Reset / control (1.37) | `CLEAR`, `NORMAL` |
| Styles (1.37) | `BOLD`, `ITALIC`, `UNDERLINE`, `INVERT`, `HIDE`, `STRIKETHROUGH` |
| Foreground (1.37) | `BLACK`, `RED`, `GREEN`, `YELLOW`, `BLUE`, `MAGENTA`, `CYAN`, `WHITE` |
| Background (1.37) | `BG_BLACK`, `BG_RED`, `BG_GREEN`, `BG_YELLOW`, `BG_BLUE`, `BG_MAGENTA`, `BG_CYAN`, `BG_WHITE` |

```just
ok:
    @echo "{{GREEN}}✓ passed{{NORMAL}}"
```

Prefer `style('error')` / `style('warning')` over hand-picked colors when you want to match `just`'s own output.

## Connections

- Parent: [[just]] [[skill]] — [SKILL.md](SKILL.md)
- `which()` and list-accepting variants: [unstable.md](unstable.md)
- Where functions may and may not appear: [attributes-settings.md](attributes-settings.md)

## 🔄 Provenance

Transcribed from the upstream Programmer's Manual "Functions" and "Constants" sections at just **1.57.0**, verified 2026-07-28. The `_dir` abbreviation and `home_dir()` / `cache_dir()` resolution were confirmed against a local 1.57.0 binary; the remaining function bodies were not individually executed *(unverified beyond the manual)*.

Upstream lists bright-color and 256-color escape constants inconsistently across versions; only the constants present in the 1.57.0 table are reproduced here. To refresh, diff the manual's Functions section — new entries carry a version superscript.
