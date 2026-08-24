# [[just]] — attributes & settings

> [!abstract] Purpose
> The complete declarative surface of `just` 1.57.0: 45 recipe/module/alias attributes, 30 `set` settings, the `[arg]` flag-and-option system introduced in 1.46, and the environment/dotenv/shell/working-directory rules. This is the "which knob does X?" file — load it when annotating or configuring, not when writing command logic.

## 📥 Inputs

- **Context:** a `justfile` where you need to change *how* a recipe runs rather than *what* it runs — visibility, grouping, working directory, environment, confirmation, OS gating, argument parsing.
- **Constraints:** every setting may be specified **at most once** anywhere in the file. Settings are per-module: `import` shares the root's settings, `mod` does not. `set lists` and `[cache]` additionally require `set unstable` — see [unstable.md](unstable.md).
- **Anti-use:** don't reach here for recipe body logic, dependency ordering, or expressions — that's [SKILL.md](SKILL.md). Don't use attributes to emulate a build system's freshness checks.

## 📤 Outputs

- **Result:** recipes that are grouped and documented in `--list`, hidden when internal, gated by OS, given a working directory, handed a private environment, or exposed as a real CLI with `--flags`.
- **Side effects:** `dotenv-*` settings read files from disk at parse time and can abort the run if `dotenv-required` or `dotenv-path` finds nothing. `set export` makes every variable visible to child processes. `[env]` values are visible to `shell()` invocations as of 1.57.

## ⛓️ Workflow

```just
set unstable                          # only if you need lists / cache / user functions
set shell := ["nu", "-c"]
set dotenv-load                       # .env → environment
set positional-arguments              # recipe bodies get $1 $2 $@

[group('deploy')]                     # bucket it in --list
[confirm("ship to production?")]      # y/N gate; --yes bypasses
[working-directory('infra')]          # run from elsewhere
[env('AWS_PROFILE', 'prod')]          # private env var for this recipe
[arg('force', long, value='--force')] # real flag: just ship --force
ship force='':
    terraform apply {{force}}
```

## 📋 Core invariants

1. **Attributes stack or comma-separate.** `[no-cd]` on its own line, or `[no-cd, private]` on one. Single-argument attributes also accept colon form: `[group: 'bar']`.
2. **A setting appears at most once per module.** Duplicates are an error, not a last-wins override.
3. **`[arg]` names the *parameter*, not the flag.** `[arg('release', long)]` attaches to parameter `release`; `long` without a value defaults to the parameter name, `short` without a value defaults to its first character.
4. **A flag parameter still needs a default to be optional.** `[arg('bar', long, value='hello')] foo bar='goodbye':` yields `goodbye` when `--bar` is absent. Without a default, the flag is required.
5. **`{{var}}` vs `$var` is decided here.** Only `export`ed assignments, `set export`, `$`-prefixed parameters, dotenv variables, and `[env(...)]` put a name into the process environment.
6. **OS attributes gate *any* item as of 1.56**, not just recipes — including `set shell`. That is the supported way to vary shell by platform now.
7. **`set windows-shell` and `set windows-powershell` are deprecated.** Use `[windows]` on `set shell`.
8. **Non-boolean settings accept expressions** (1.46), but those expressions may not contain backticks or function calls, directly or transitively — settings affect how backticks evaluate, so the dependency would be circular.

## ⚠️ Gotchas

```just
# ❌ setting the same thing twice
set dotenv-load
set dotenv-load := true
# error: setting `dotenv-load` first set on line 1 is redefined on line 2
# ✅ pick one form; `set NAME` is exactly `set NAME := true`
```

```just
# ❌ expecting a plain variable in the environment
region := "eu-west-1"
deploy:
    aws --region $region       # empty
# ✅
export region := "eu-west-1"   # …or `set export`, or `[env('region', 'eu-west-1')]`
```
**Cause:** assignment creates a just-side value, not an environment entry. **Fix:** `export`, `set export`, `$`-parameter, or `[env]`.

```just
# ❌ a settings expression that calls a function
set tempdir := justfile_directory() / "tmp"
# error: expected string literal ... settings may not contain function calls
# ✅ use a literal, or an environment variable read outside just
set tempdir := "./tmp"
```
**Cause:** settings are resolved before the machinery that functions depend on. **Fix:** keep settings to literals and const expressions.

```just
# ❌ [arg] pattern that matches a substring
[arg('n', pattern='\d+')]
double n:
# `just double 12abc` still fails — and that is intended
```
**Cause:** `just` wraps the pattern in `^…$`, so it must match the **entire** value. **Fix:** none needed; just don't expect partial matching. Use `|` for alternatives: `pattern='--help|--version'`.

```just
# ❌ combining flag and pattern
[arg('x', long, value='v', pattern='a|b')]
# error: [arg(flag)] may not be combined with [arg(pattern)]   (forbidden in 1.57)
# ✅ a valueless flag has nothing to validate — drop `pattern`
```

- **Duplicate `[group]` names are forbidden as of 1.57** — `[group('a'), group('a')]` errors.
- **`[private]` hides from `--list`; a leading `_` does too.** House style uses both, so the intent survives a rename.
- **`[confirm]` prompts on every invocation, including as a dependency.** Guard the top-level verb, not an inner helper, or CI will hang without `--yes`.
- **`[no-cd]` vs `set no-cd`** — the attribute opts one recipe out of the chdir; the setting (1.51) flips the default for recipes carrying the attribute-style behavior module-wide.
- **Submodule recipes chdir to the submodule's directory** unless `[no-cd]`. `justfile()` and `justfile_directory()` still resolve to the **root** justfile — use `module_directory()` / `source_directory()` for the local one.

## 📝 Cheat sheet

```just
[private] [group('x')] [doc('text')] [default] [confirm] [confirm('prompt')]
[no-cd] [working-directory('p')] [positional-arguments] [parallel] [continue]
[env('K','V')] [metadata('m')] [script] [script('nu')] [shell] [extension('.py')]
[no-exit-message] [exit-message] [no-quiet] [cache]
[unix] [linux] [macos] [windows] [openbsd] [freebsd] [netbsd] [dragonfly] [android]

[arg('p', long)] [arg('p', long='name')] [arg('p', short)] [arg('p', short='b')]
[arg('p', value='V')] [arg('p', pattern='\d+')] [arg('p', help='text')]
[arg('p', multiple)] [arg('p', min='2')] [arg('p', max='4')]

set shell := ["nu","-c"]      set export      set quiet       set unstable
set dotenv-load               set dotenv-filename := ".env.local"
set positional-arguments      set fallback    set lazy        set guards
set working-directory := "."  set script-interpreter := ["nu","-c"]
set allow-duplicate-recipes   set allow-duplicate-variables   set ignore-comments
set default-list              set default-script              set minimum-version := "1.57.0"
```

---

## 1. Attributes (45)

Annotate recipes, `mod` statements, and aliases. Superscripts are the version that introduced the feature.

### Argument parsing — `[arg]`

| Attribute | Since | Effect |
|---|---|---|
| `[arg(ARG, long="LONG")]` | 1.46 | pass `ARG` as `--LONG`. Value may be omitted → defaults to the parameter name. Variadic parameters make it repeatable (1.55). |
| `[arg(ARG, short="S")]` | 1.46 | pass `ARG` as `-S`. Value may be omitted → defaults to the parameter's first character (1.55). |
| `[arg(ARG, value=VALUE)]` | 1.46 | make it a flag taking **no** value; the parameter receives `VALUE`. `VALUE` may be an expression (1.54). |
| `[arg(ARG, pattern="RE")]` | 1.45 | reject values not matching `RE`. Anchored `^…$`. May be a const expression (1.55) or, with lists, a list of alternatives. |
| `[arg(ARG, help="TEXT")]` | 1.46 | help string shown by `just --usage`. May be a const expression (1.55). |
| `[arg(ARG, multiple)]` | 1.55 | allow the option or flag to be passed more than once, collecting values. |
| `[arg(ARG, min="N")]` / `[arg(ARG, max="N")]` | 1.56 | bound the value count. Requires `multiple` or a variadic parameter, and `set lists`. |

```just
[arg('release', long, value='--release')]
[arg('jobs', short, long, help='parallel jobs')]
[arg('target', long, pattern='debug|release')]
build release='' jobs='1' target='debug':
    cargo build {{release}} -j {{jobs}} --profile {{target}}
```
```console
$ just build --release -j 4 --target=release
$ just --usage build
Usage: just build [OPTIONS]
Options:
      --release
  -j, --jobs jobs [default: '1']  parallel jobs
      --target target [default: 'debug']
```

Short options combine (1.55): `-abc` ≡ `-a -b -c`, and a value-taking short option may come last (`-abcd VALUE`). Options may also be written `--name=value`.

### Visibility, grouping, documentation

| Attribute | Since | Effect |
|---|---|---|
| `[private]` | 1.10 | hide recipe / alias / variable from `--list`. A leading `_` does the same. |
| `[group(NAME)]` | 1.27 | bucket in `--list` and `--choose`; filter with `--group NAME`. Duplicates forbidden (1.57). |
| `[doc(DOC)]` | 1.27 | set the doc string; bare `[doc]` suppresses the preceding comment. Const expression allowed (1.56). |
| `[default]` | 1.43 | run on bare `just`, or as a module's default. |
| `[metadata(M)]` | 1.42 | attach an arbitrary string, readable via `--dump --dump-format json`. |

### Execution control

| Attribute | Since | Effect |
|---|---|---|
| `[confirm]` / `[confirm(PROMPT)]` | 1.17 / 1.23 | require y/N first; `--yes` bypasses. Prompt may be an expression (1.49). |
| `[no-cd]` | 1.9 | don't chdir to the justfile directory — operate where the user invoked. |
| `[working-directory(PATH)]` | 1.38 | run from `PATH`; expression allowed (1.51), relative to the default working directory. |
| `[positional-arguments]` | 1.29 | expose `$1 $2 $@` to the body. |
| `[parallel]` | 1.42 | run this recipe's dependencies concurrently. |
| `[continue(SIGNALS)]` | 1.54 | continue normally if a command is interrupted by `SIGNALS` and exits successfully. Defaults to `SIGINT`. |
| `[env(NAME, VALUE)]` | 1.47 | set an environment variable for this recipe. Both may be expressions (1.51); overrides module-level exports (1.51); visible to `shell()` (1.57). |
| `[no-exit-message]` / `[exit-message]` | 1.7 / 1.39 | suppress or force the failure message. |
| `[no-quiet]` | 1.23 | echo this recipe even under `set quiet`. |
| `[cache]` | 1.54 | skip invocation on a cache hit. **Unstable** — see [unstable.md](unstable.md). |

### Interpreter selection

| Attribute | Since | Effect |
|---|---|---|
| `[script]` | 1.33 | run the body as one script via `set script-interpreter` (default `['sh','-eu']`). Stabilized 1.44. |
| `[script(COMMAND)]` | 1.32 | run the body as one script via `COMMAND`. |
| `[shell]` | 1.52 | force shell-recipe behavior, overriding `set default-script`. |
| `[extension(EXT)]` | 1.32 | file extension for the script/shebang temp file; include the leading period. |

### OS gating

`[unix]` `[linux]` `[macos]` `[windows]` `[openbsd]` `[freebsd]` `[netbsd]` `[dragonfly]` `[android]` — enable the item only on that platform. As of **1.56 these apply to any item**, not just recipes:

```just
[windows]
set shell := ["powershell.exe", "-NoLogo", "-Command"]

[unix]
set shell := ["nu", "-c"]
```

`[unix]` includes macOS. Multiple OS attributes on one item are additive.

## 2. Settings (30)

| Setting | Value | Default | Purpose |
|---|---|---|---|
| `shell` | `[CMD, ARGS…]` | `sh -cu` | command for recipe lines and backticks. **`set shell := ["nu", "-c"]`** |
| `script-interpreter` <sup>1.33</sup> | `[CMD, ARGS…]` | `['sh','-eu']` | interpreter for bare `[script]` recipes |
| `default-script` <sup>1.52</sup> | bool | false | make recipes scripts by default |
| `default-list` <sup>1.52</sup> | bool | false | bare `just` lists instead of running the default |
| `export` | bool | false | export every variable as an environment variable |
| `dotenv-load` | bool | false | load `.env` if present |
| `dotenv-filename` | string | – | custom `.env` name |
| `dotenv-path` | string | – | explicit path; errors if missing; overrides `dotenv-filename` |
| `dotenv-required` | bool | false | error when no dotenv file is found |
| `dotenv-override` | bool | false | dotenv values beat existing environment variables |
| `dotenv-command` <sup>1.54</sup> | string | – | run a command and load its output as an environment file |
| `positional-arguments` | bool | false | pass `$1 $2 $@` to bodies |
| `working-directory` <sup>1.33</sup> | string | – | base directory for recipes and backticks |
| `no-cd` <sup>1.51</sup> | bool | false | don't chdir when executing recipes |
| `fallback` | bool | false | search parent directories for an unknown recipe |
| `quiet` | bool | false | disable echoing |
| `ignore-comments` | bool | false | don't echo `#` lines in shell recipes (not script recipes) |
| `no-exit-message` <sup>1.39</sup> | bool | false | suppress failure messages globally |
| `allow-duplicate-recipes` | bool | false | later definition wins — needed with `import` |
| `allow-duplicate-variables` | bool | false | same, for variables |
| `lazy` <sup>1.47</sup> | bool | false | skip evaluating unused variables. Exported ones always evaluate. |
| `guards` <sup>1.47</sup> | bool | false | enable the `?` line sigil; otherwise `?` is literal text |
| `indentation` <sup>1.56</sup> | string | – | body indentation used by `--fmt` and `--dump` |
| `minimum-version` <sup>1.55</sup> | string | – | error if `just` is older, e.g. `"1.57.0"` |
| `tempdir` | string | – | where script/shebang bodies are written |
| `unstable` <sup>1.31</sup> | bool | false | enable unstable features |
| `lists` <sup>1.53</sup> | bool | false | values may be lists. **Unstable.** |
| `windows-shell` | `[CMD, ARGS…]` | – | **deprecated** — use `[windows]` on `set shell` |
| `windows-powershell` | bool | false | **deprecated** — use `[windows]` on `set shell` |

Boolean settings: `set NAME` ≡ `set NAME := true`.

**Shell precedence, highest first:** `--shell` / `--shell-arg` on the command line (which make `just` ignore justfile shell settings entirely) → `set windows-shell` → `set windows-powershell` → `set shell`.

## 3. Environment, export, dotenv

```just
export DATABASE_URL := "postgres://…"      # one variable into the environment
set export                                  # all variables into the environment

set dotenv-load                             # load .env
set dotenv-filename := ".env.local"
set dotenv-required                         # abort if it's missing

serve:
    ./app --url $DATABASE_URL               # $… because it was exported
```

- `env('KEY')` and `env('KEY', 'default')` read environment variables inside expressions. `env_var` / `env_var_or_default` are the older spellings.
- Environment files load per module, honoring that module's settings; parent-module variables are visible in child modules.
- `[env(NAME, VALUE)]` is the narrowest tool: one variable, one recipe, overriding module-level exports.
- Under `set lazy`, exported assignments always evaluate, because `just` cannot tell whether a child process will read them.

## 4. Working directory

By default a recipe runs in the directory containing the justfile — not where the user invoked `just`. Three escapes, narrowest first:

| Want | Use |
|---|---|
| this recipe runs where the user is | `[no-cd]` |
| this recipe runs somewhere specific | `[working-directory('infra')]` |
| the whole module has a different base | `set working-directory := "src"` |

`invocation_directory()` always returns where the user actually ran `just`, regardless of chdir behavior.

## Connections

- Parent: [[just]] [[skill]] — [SKILL.md](SKILL.md)
- Function names referenced here are catalogued in [functions.md](functions.md)
- `[cache]` and `set lists` semantics live in [unstable.md](unstable.md)

## 🔄 Provenance

Attribute and settings tables transcribed from the upstream Programmer's Manual (`README.md` at master, sections "Attributes" and "Settings") at just **1.57.0**, verified 2026-07-28. Version superscripts are upstream's. The `[timestamp]` and `[timestamp(FORMAT)]` attributes are marked `master` upstream — **unreleased as of 1.57.0** and therefore omitted from the tables above *(unverified)*.

To refresh: diff the two tables in the upstream README against this file; new rows are the whole delta.
