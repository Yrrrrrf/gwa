# GWA native

This directory owns the optional native layer. App Deno files need no native,
build, or dev tasks. The root Deno workspace and existing Just scripts are
unchanged. Invoke `native/cli.ts` directly or use its standalone `deno.json`.

## Output

A successful default build publishes these files in `apps/<app>/build`:

| Artifact | Minimal example |
| --- | --- |
| SPA directory | `spa/index.html`, assets, and the rest of the static site |
| Host executable | `gwa-minimal` (`gwa-minimal.exe` on Windows) |
| Android APK | `gwa-minimal-0.0.1.apk` |
| Optional iOS IPA | `gwa-minimal-0.0.1.ipa` |

Only the SPA is a directory. The native name follows the generated Cargo
package (`gwa-<registry-name>`), and the version is read from the selected
app's `deno.json`. The display title comes from the registry. No app name or
version is duplicated in the commands.

The desktop output is the executable of the current host, built with
`--no-bundle`. It is not a Linux installer, macOS application bundle, or DMG.
Here Apple mobile means an iPhone/iPad IPA; iOS is an explicit macOS stage.

## Build flow

`build` runs the selected frontend once. It uses an app build task when one
exists, otherwise the existing Vite command directly. Removing minimal's
`dev` and `build` aliases therefore requires no native change. No task name
is watched: frontend commands run only when explicitly invoked by the runner.

`cycle` first runs the exact existing `just cycle` from the client root, then
shared Rust formatting. It checks and reuses the frontend produced by that
successful pipeline. It does not run Vite again before each native target.
A failed web gate stops native compilation.

The ordinary frontend output location remains the registry's `frontendDist`
(`build` for the supplied Svelte apps; `dist` for a typical Vite React app).
The runner captures those files in `native/projects/<app>/frontend`. Every
native target embeds this same snapshot. Unchanged snapshot files keep their
modification times, and obsolete files are removed.

Tauri's generated `frontendDist` points at that snapshot, never at the final
aggregate directory containing native binaries. Wrapper-controlled native
builds pass a temporary JSON config override setting `beforeBuildCommand` to
null, because the SPA has already been built or checked. The persistent config
retains its frontend hook for direct Tauri usage. Development hooks are retained.

When Vite's normal output is also `apps/<app>/build`, a plain native build
preserves the previous published directory while the frontend writes its normal
output. After capturing the SPA it restores the prior result until native
compilation succeeds. The final publication stages the SPA and native files
beside the destination and swaps them into `build`. A frontend or native failure
in a plain build retains the last complete published output. The existing full
cycle's cleanup can remove old output before its web gates, as it always did.

A single-target build replaces that target's old package and the SPA while
retaining the other targets' previously published files. Use a default build
for a fresh desktop/APK pair. A failed native target produces no success summary.
The final summary uses green for success, yellow labels, and cyan absolute paths.
Redirected output and `NO_COLOR` use plain text. Executable permissions survive copying.

Running an ordinary web build later still writes the template's usual web
output and may replace the combined directory. Run the native build/cycle
again to collect native outputs. Shared web scripts are not redirected or modified.

## Rust caches

Rust still compiles each OS/architecture and profile separately. A Linux
executable cannot reuse Android machine code. Default behavior remains desktop
release plus an ARM64 Android debug APK. `--debug` selects desktop debug too;
`--release` selects release mobile packages too.

Cargo targets now live outside the client tree, normally at:

`$XDG_CACHE_HOME/gwa-native/<client-path-hash>/<app>/target`

If XDG cache is unset, the runner uses `~/.cache` (or the Windows local app-data
cache). Set `GWA_NATIVE_CACHE_DIR` to choose a different cache base outside the
client tree. Separate checkouts and apps receive distinct paths. The root's
`**/build` cleanup cannot delete these Cargo build-script directories.

On first use, an old `native/projects/<app>/src-tauri/target` is relocated when
the external cache is absent and a filesystem rename is possible. During a
cycle this happens before the web cleanup. If relocation fails, the old tree
is left intact and the external cache is populated normally. Relocation or
config changes can still refresh build-script outputs once; no zero-rebuild
promise is made. Warm target/profile caches are reused on later builds.

Only caches are external. Authored code, config, scripts, generated projects,
and the SPA snapshot remain owned by `native`. Removing its directory does
not delete the shared web template. Old external cache namespaces can be
removed manually when no build is running.

## Files and ownership

| Path | Responsibility |
| --- | --- |
| `cli.ts` | App selection, hooks, one-time frontend preparation, caches, target builds, publication, and colored paths |
| `cli_test.ts` | Native contracts, subprocess failures, rollback, cache migration, frontend reuse, and output tests |
| `deno.json` | Isolated tooling tasks and pinned Tauri CLI 2.12.1 |
| `apps.json` | Enabled app identities and ordinary frontend output paths |
| `host/Cargo.toml` | Shared host; Tauri 2.12.2 and tauri-build 2.7.1 |
| `host/Cargo.lock` | Shared resolved Rust dependency graph |
| `host/build.rs`, `host/src/` | Shared Rust startup and official Tauri build helper |
| `host/tauri.conf.json` | Shared window, local capabilities, CSP, icon, and Android defaults |
| `nix.nix` | Desktop inputs and Android environment inheriting those inputs |
| `projects/<app>/` | Ignored generated source, platform projects, operation lock, and SPA snapshot |

A generated project-root `deno.json` provides the pinned `tauri` callback task
used by the Android Gradle and iOS Xcode integration. It is generated, not an
app requirement. An operation lock protects an app's generated files during
native work. If a process is killed, confirm it has stopped before removing its
`operation.lock`.

Native identity is stable: changing a generated app's identifier or display
name requires explicitly migrating/backing up its platform project, or using a
new registry name. Routine materialization preserves generated Android/iOS
source and signing customizations; unchanged shared files are not rewritten.

## App registry

The supplied registry enables `minimal` and `svelte`. Each entry requires an
`identifier` and the app's normal `frontendDist`. Optional fields are
`productName`, `directory` relative to `client/apps`, PNG `icon` relative to
`native`, `port`, and additional Tauri `app`, `bundle`, or `plugins` settings.

```json
{
  "minimal": {
    "identifier": "dev.yrrrrrf.gwa.minimal",
    "productName": "GWA Minimal",
    "frontendDist": "build"
  }
}
```

Version, authors, and license come from app metadata. The frontend must produce
a static `index.html`. The runner owns identity, version, icon placement, hooks,
and native frontend paths; registry overrides cannot replace those fields.
Objects merge, arrays replace. Plugin configuration does not install/register
a Rust plugin; add actual native dependencies and registration in the shared host.

## Nix and removability

The Android shell inherits the desktop dependencies, including pkg-config,
GTK3, WebKitGTK 4.1, libsoup3, D-Bus, OpenSSL, and related Linux inputs. Its SDK
composition retains Platforms 36 and 37.0, Build Tools 36.0.0 and 37.0.0, command
line tools 22.0, platform tools 37.0.1, NDK 29.0.14206865, and JDK 21. Platform 36
serves Tauri's Android library; Platform 37 serves the generated app. The
`android-37` alias and Nix AAPT2 override are retained. No emulator images or
CMake are included. Studio managed by Toolbox can remain installed separately.

The existing root flake bridge is sufficient while `native` exists. This
native-only archive does not edit that file. For completely detachable Nix
support, the root flake should conditionally import `native/nix.nix` when
`builtins.pathExists ./native/nix.nix` is true, and merge its shells into the
existing `devShells`; otherwise keep only the original shells. An unconditional
import must be removed or guarded before deleting `native`. No root Deno task
or app task is needed for this integration.

## Commands

Run from the client root, one command at a time. Keep your existing
`native/projects` when copying the archive's authored files into `client/native`.
You can remove the minimal app's plain Vite task aliases yourself.

Enter the environment for desktop and Android:

```sh
nix develop .#android
```

Build one SPA, the desktop executable, and Android APK:

```sh
deno run -A native/cli.ts build minimal
```

Run the existing full web pipeline, then reuse its SPA for both native targets:

```sh
deno run -A native/cli.ts cycle minimal
```

Print collected output paths without rebuilding:

```sh
deno run -A native/cli.ts paths minimal
```

Inspect the plan without writing or running build tools:

```sh
deno run -A native/cli.ts build minimal --dry-run
```

Build Android only:

```sh
deno run -A native/cli.ts build minimal --target android
```

Build desktop only:

```sh
deno run -A native/cli.ts build minimal --target desktop
```

Use debug profiles for iteration:

```sh
deno run -A native/cli.ts build minimal --debug
```

Build release packages after configuring Android release signing:

```sh
deno run -A native/cli.ts build minimal --release
```

Build an x86_64 APK instead of ARM64:

```sh
deno run -A native/cli.ts build minimal --target android --arch x86_64
```

Find the final APK:

```sh
fd --no-ignore --type f --extension apk . apps/minimal/build
```

Develop on Android:

```sh
deno run -A native/cli.ts dev minimal
```

Develop the desktop window:

```sh
deno run -A native/cli.ts dev minimal --target desktop
```

Run the collected Linux executable:

```sh
./apps/minimal/build/gwa-minimal
```

Inspect Tauri's environment:

```sh
deno run -A native/cli.ts info minimal
```

The equivalent standalone task form remains available:

```sh
deno task --config native/deno.json build minimal
```

### Optional Apple mobile stage

Use a Mac with full Xcode, the iOS prerequisites, and an Apple development team
and signing setup. No iOS command runs by default on NixOS. A signed device
IPA is exported with `debugging` by default. This runner does not invent signing
credentials or turn an unsigned archive into a distributable app.

```sh
deno run -A native/cli.ts build minimal --target ios
```

Explicitly build all three targets on macOS:

```sh
deno run -A native/cli.ts build minimal --target all
```

Choose an App Store export after configuring the required signing:

```sh
deno run -A native/cli.ts build minimal --target ios --release --export-method app-store-connect
```

The IPA is collected as `apps/minimal/build/gwa-minimal-<version>.ipa`.
macOS `.app`/DMG packaging is a separate desktop-bundling concern and is not
added to this minimal native host.

### Validation

```sh
deno task --config native/deno.json check
```

```sh
deno run -A native/cli.ts fmt
```

```sh
just cycle
```

## Verification and limits

The runner was formatted, linted, typechecked, and exercised with Deno 2.9.6,
the available validation runtime. All 23 tests passed. They cover absent app
tasks, one frontend build for multiple targets, successful-cycle frontend reuse,
flat versioned outputs, executable permissions, unchanged SPA timestamps,
cache relocation, platform gating, iOS command/export paths, rollback after
frontend/native failure, identity preservation, and subprocess exit codes.
Native build subprocesses in these tests are fixtures; these tests are not an
Android or iOS device build.

Pinned Tauri CLI 2.12.1 and cargo-mobile2 0.22.5 sources were checked for the
JSON hook override and Apple init/build/IPA output contracts. Rust source and
pins, Nix SDK versions, app files, root configuration, and shared pipeline files
were preserved. The earlier user-confirmed desktop/APK builds validate the
underlying host before this orchestration update. This environment has not
rebuilt a new desktop executable, Android APK, or signed IPA with this version.
The combined native cycle still needs verification on your configured machine.

The exact original `just cycle` was attempted and stopped at its first prune
command: the existing `jsr:@yrrrrrf/dv@0.0.5` manifest returned upstream HTTP
403 (reported as a 502 by the validation registry mirror). The shared pipeline
was not changed or weakened to bypass this external blocker.

The original source export omitted several other apps' image assets. Keep your
original project assets; the native-only archive does not replace those apps.

Official references:
[Tauri CLI](https://v2.tauri.app/reference/cli/),
[Tauri prerequisites](https://v2.tauri.app/start/prerequisites/),
[Tauri App Store output](https://v2.tauri.app/distribute/app-store/),
[Cargo build cache](https://doc.rust-lang.org/cargo/reference/build-cache.html).
