# GWA Native

The Rust runner (`native/runner`) builds any client SPA in `apps/*` and packages it with the shared Tauri host (`native/host`). Native orchestration uses Cargo and the official Tauri CLI, while Deno and Vite build the frontend.

## Quick Start

### 1. Enter the Nix shell (from `src/client`)

- **Desktop + Android** (recommended):
  ```sh
  cd src/client
  nix develop .#android
  ```
- **Desktop only** (faster shell load):
  ```sh
  cd src/client
  nix develop .#desktop
  ```

*(An iOS IPA requires macOS with full Xcode and Apple signing configuration.)*

### 2. Ensure Tauri CLI `2.12.1` is installed

The runner verifies `cargo tauri` `2.12.1` on `PATH`:

```sh
cargo tauri --version || cargo install tauri-cli --version '=2.12.1' --locked
```

### 3. Commands (run from `src/client`)

**List discovered apps (`minimal`, `react`, `svelte`, `vue`):**
```sh
cargo run --manifest-path native/runner/Cargo.toml -- list
```

**Inspect resolved configuration (dry run):**
```sh
cargo run --manifest-path native/runner/Cargo.toml -- build minimal --dry-run
```

**Build:**
```sh
# Build Desktop binary + Android APK (default on Linux/Windows; macOS adds iOS)
cargo run --manifest-path native/runner/Cargo.toml -- build minimal

# Build Desktop only
cargo run --manifest-path native/runner/Cargo.toml -- build minimal --target desktop

# Build Android APK only (optional --arch aarch64|armv7|i686|x86_64, --release)
cargo run --manifest-path native/runner/Cargo.toml -- build minimal --target android

# Build iOS IPA on macOS
cargo run --manifest-path native/runner/Cargo.toml -- build minimal --target ios --release --export-method app-store-connect

# Run full web cycle (just cycle) and then native build
cargo run --manifest-path native/runner/Cargo.toml -- cycle minimal
```

**Inspect published artifacts (`apps/<app>/build/`):**
```sh
cargo run --manifest-path native/runner/Cargo.toml -- paths minimal
```

**Live development:**
```sh
# Desktop window with hot reload
cargo run --manifest-path native/runner/Cargo.toml -- dev minimal --target desktop

# Android device/emulator (defaults to --target android)
cargo run --manifest-path native/runner/Cargo.toml -- dev minimal
```

## Zero-Config App Discovery & Icons

Every folder under `apps/<slug>` containing a `deno.json` is discovered automatically with sensible defaults:

- **`identifier`**: `dev.yrrrrrf.gwa.<slug>`
- **`productName`**: `GWA <Slug>`
- **`frontendDist`**: `build`
- **`port`**: `1420`

If an app ever needs custom native settings, add an optional `"native"` object inside its existing `apps/<folder>/deno.json`:

```json
{
  "native": {
    "slug": "custom-name",
    "identifier": "dev.yrrrrrf.gwa.custom",
    "productName": "GWA Custom",
    "frontendDist": "build",
    "icon": "icons/custom.png",
    "port": 1420
  }
}
```

### Icon resolution

Without an explicit `native.icon` (relative to `src/client/native`), the runner automatically checks:

1. `apps/<app>/icon.png` or `apps/<app>/icon.svg`
2. `native/icons/<slug>.png` or `native/icons/<slug>.svg`
3. `apps/<app>/src/lib/assets/img/<slug>.svg` (or `<folder>.svg` / `svelte.svg`)
4. `native/host/icons/icon.png`

The runner initializes mobile projects before running `cargo tauri icon --fit contain`, populating Android launcher mipmaps, the iOS `AppIcon` catalog, the Windows executable `.ico`, and the desktop `.png`.

## Outputs, Caching & Validation

Each successful build publishes to `apps/<app>/build/`:
- `spa/` — static web bundle
- `gwa-<app>` (or `.exe`) — standalone desktop executable
- `gwa-<app>-<version>.apk` — Android package
- `gwa-<app>-<version>.ipa` — iOS package

Single-target builds preserve previously published artifacts for other targets, and failed builds roll back cleanly to the previous published output. Cargo build caches live outside the repo cleanup tree under `$XDG_CACHE_HOME/gwa-native` (or `GWA_NATIVE_CACHE_DIR`), while generated platform projects persist in `native/projects/<app>/src-tauri/gen`.

**Validate the runner and host:**
```sh
cargo run --manifest-path native/runner/Cargo.toml -- fmt
cargo clippy --manifest-path native/runner/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path native/runner/Cargo.toml
```
