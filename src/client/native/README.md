# GWA native

The Rust runner builds the existing client SPA and packages it with the shared Tauri host. The native tooling uses Cargo and the official Tauri CLI. Deno and Vite still build the existing frontend.

## Install or upgrade

Place this directory at `src/client/native`. When upgrading, stop existing builds and back up the old directory outside `src/client`. Carry over `native/projects/` to preserve generated platform projects, signing settings and stable identities. If your old `native/host/` has custom Rust code, Tauri settings, a lockfile or artwork, carry over that host as well. The replacement includes a host reconstructed from the documented GWA template. The original host files and artwork were absent from the source export.

This version discovers app-local `native.json` files. Before retiring an old custom entry from `native/apps.json`, copy its settings into `apps/<folder>/native.json`. Put the old entry key in `slug` when it differs from the folder name and drop the old `directory` field. Preserve the original `identifier` and `productName` for installed apps. The runner has built-in defaults for existing `apps/minimal` and `apps/vision` folders, so those standard entries need no migration file.

The first build or init for each mobile platform switches its stock callbacks from Deno to Cargo in place. Android uses `BuildTask.kt`. iOS uses `project.yml` and the existing Xcode project’s build phase. The generated Deno bridge is removed after its remaining callbacks are migrated. If a selected platform has a custom Deno callback, the runner reports its file so you can update the command without recreating the project.

## Prerequisites

- Rust 1.90 or newer and the Cargo Tauri CLI pinned to 2.12.1.
- Deno for the existing frontend. The `cycle` command also calls the existing Just recipe.
- Platform tools for your selected target. On NixOS enter `nix develop .#android` or `nix develop .#desktop` first. Windows desktop builds use the Windows Tauri prerequisites. An iOS IPA needs macOS, full Xcode and the app's signing configuration.

Install the Tauri CLI from the target build environment and ensure its Cargo bin directory is on `PATH`.

```sh
cargo install tauri-cli --version '=2.12.1' --locked
cargo tauri --version
```

## Commands

Run these from `src/client`.

```sh
cargo run --locked --manifest-path native/runner/Cargo.toml -- list
cargo run --locked --manifest-path native/runner/Cargo.toml -- build minimal
cargo run --locked --manifest-path native/runner/Cargo.toml -- build minimal --target desktop
cargo run --locked --manifest-path native/runner/Cargo.toml -- build minimal --target android --arch x86_64
cargo run --locked --manifest-path native/runner/Cargo.toml -- build minimal --target ios --release --export-method app-store-connect
cargo run --locked --manifest-path native/runner/Cargo.toml -- dev minimal
cargo run --locked --manifest-path native/runner/Cargo.toml -- paths minimal
```

`build` and `cycle` default to desktop plus Android on Linux and Windows, and desktop plus Android and iOS on macOS. Use `--target both` on macOS to select desktop plus Android. Desktop defaults to release. Mobile defaults to debug unless you pass `--release`. `init` and `dev` default to Android. Use `--dry-run` on build, init, dev, cycle or info to print configuration without invoking build tools.

## App configuration and icons

Apps with their own native settings can declare them in `apps/<folder>/native.json`.

```json
{
  "identifier": "dev.yrrrrrf.gwa.minimal",
  "productName": "GWA Minimal",
  "frontendDist": "build",
  "icon": "icons/minimal.png"
}
```

`frontendDist` is relative to the app folder, and `icon` is relative to `src/client/native`. Without an explicit icon, the runner checks the app's root `icon.png` or `icon.svg`, then `native/icons/<slug>.png` or `<slug>.svg`, the template's existing Svelte SVG, and the shared host's `icons/icon.png`. Supply the app's actual artwork. The archive contains no substitute logo.

The runner initializes the selected mobile projects before invoking Tauri’s icon generator. It supplies Android launcher resources, the iOS AppIcon catalog, the Windows executable ICO and the Linux window PNG. A desktop-only build stages the generator outside the mobile resource tree. For a Linux app menu icon, install a `.desktop` entry with `Icon=` or package the executable separately. The desktop output is a standalone executable.

## Outputs and validation

Each successful build publishes `apps/<app>/build/spa/` and its selected native artifacts. Android and iOS outputs are named `gwa-<app>-<version>.apk` and `gwa-<app>-<version>.ipa`. A single-target build retains previously published artifacts for the other targets. The frontend is built once and staged under `native/projects/<app>/frontend`. A plain build restores the previous published output when a subprocess fails. `cycle` reuses the existing web pipeline's output and its normal cleanup rules still apply.

The runner retains the external Cargo cache layout under `$XDG_CACHE_HOME/gwa-native` or the platform fallback. Use `GWA_NATIVE_CACHE_DIR` to select an alternate base outside `src/client`. Generated Gradle and Xcode projects live under `native/projects/<app>/src-tauri/gen`.

```sh
cargo fmt --manifest-path native/runner/Cargo.toml --all -- --check
cargo clippy --locked --manifest-path native/runner/Cargo.toml --all-targets -- -D warnings
cargo test --locked --manifest-path native/runner/Cargo.toml
```

Runner tests use fixture projects and simulated build subprocesses. A full build uses the app's frontend and the target platform tools.
