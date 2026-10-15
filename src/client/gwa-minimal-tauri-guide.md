# GWA Minimal — Tauri implementation guide

This document describes the Tauri integration delivered in `gwa-client-minimal-tauri.zip`, including the desktop D-Bus correction, and the Linux and Android builds confirmed on your NixOS machine.

The existing `apps/minimal` SvelteKit application now has a small native host in `apps/minimal/src-tauri`. Its existing UI can run in a Linux desktop window or be packaged as an Android APK. Deno remains the frontend task runner, Rust provides the native host, and the existing Just pipeline remains the workspace validation entry point.

**Confirmed outputs on your machine:**

| Build | Confirmed output, relative to the client root |
| --- | --- |
| Linux release executable | `apps/minimal/src-tauri/target/release/gwa-minimal` |
| Android debug APK | `apps/minimal/src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk` |

The APK has been generated successfully. Installation and runtime behavior on a phone, release signing, and a successful full workspace cycle have not yet been reported.

## Scope and versions

The integration belongs to the minimal app. Other applications and the shared SDK were not given native hosts. The root Justfile, shared scripts, shared frontend configuration, and original default Nix shell were preserved.

The implementation added the native directory, app-local Tauri tasks, minimal-app Vite development settings, app-local TypeScript support, and two optional development shells in the existing root flake. The missing minimal Svelte logo was restored from the official Vite Svelte template because the supplied source export did not include its original image files.

| Item | Current value |
| --- | --- |
| Client workspace version | `0.1.0` |
| Minimal app version | `0.0.1` |
| Rust package name | `gwa-minimal` |
| Rust library name | `gwa_minimal_lib` |
| Native product name | `GWA Minimal` |
| Native application identifier | `dev.yrrrrrf.gwa.minimal` |
| Rust edition | `2024` |
| Rust minimum version declared in Cargo | `1.90` |
| Tauri Rust dependency | Exactly `2.12.2` |
| Tauri build dependency | Exactly `2.7.1` |
| Deno-managed Tauri CLI | Exactly `2.12.1` |
| Android minimum SDK API | `24` |
| Default Android build architecture | `aarch64`, also called ARM64 |

Your reported Rust and Cargo versions are `1.99.0`, which meet the declared Rust requirement. Your terminal also reported Deno `2.9.7` and Node `24.21.0`.

The workspace's `0.1.0` prompt and the native app's `0.0.1` metadata describe different packages. Adding Tauri did not raise the minimal app version.

## How the application runs

During development, Tauri starts the existing frontend development task and loads its Vite URL into a native webview. Vite serves the frontend and handles frontend updates.

During a production build, Tauri runs the existing frontend build task, consumes the generated static files in `apps/minimal/build`, and packages them with the native application. A packaged build uses those production assets; it does not require a running Vite development server.

The Linux build compiles the Rust desktop executable. The Android build compiles the Rust library for the requested Android architecture and uses the generated Android Gradle project to package the application.

The frontend continues to own pages, components, styling, and application behavior. The Rust host currently starts Tauri only: it adds no custom Rust commands, plugins, database, or replacement frontend.

## Native files and their responsibilities

All paths in this section are relative to `apps/minimal/src-tauri`.

| File | Responsibility |
| --- | --- |
| `Cargo.toml` | Native package metadata, Rust requirements, library outputs, and direct dependency versions. |
| `Cargo.lock` | Resolved Rust dependency versions for this application. |
| `build.rs` | Executes Tauri's Cargo build helper. |
| `src/lib.rs` | Shared Tauri startup function and mobile entry-point annotation. |
| `src/main.rs` | Desktop executable entry point that delegates to the library. |
| `tauri.conf.json` | App identity, frontend hooks, window settings, security, icon, and Android minimum SDK. |
| `icons/icon.png` | Native icon rendered from the minimal app's Svelte logo. |
| `biome.json` | App-local exclusions for generated native build output. |
| `.gitignore` | Excludes native artifacts, local Android properties, caches, and keystore files. |
| `README.md` | Native setup notes and the original verification history. |

### Cargo.toml and Cargo.lock

The native package is `gwa-minimal`, version `0.0.1`. It declares edition 2024 and `rust-version = "1.90"`.

Its library declaration is:

```toml
[lib]
name = "gwa_minimal_lib"
crate-type = ["staticlib", "cdylib", "rlib"]
```

These outputs let the same Rust startup code participate in desktop and mobile builds. The desktop binary calls the Rust library; mobile tooling can link the native library through the appropriate native output.

The direct dependencies are:

```toml
[build-dependencies]
tauri-build = { version = "=2.7.1", features = [] }

[dependencies]
tauri = { version = "=2.12.2", features = [] }
```

The equals signs pin exact direct versions. The empty feature lists add no explicit optional features; Cargo's dependency defaults remain enabled because `default-features = false` is not set.

Keep `Cargo.lock` with the application source. It records the resolved dependency graph. It does not pin Rustup's compiler or the Android SDK; those are separate parts of the environment.

### build.rs

```rust
fn main() {
    tauri_build::build();
}
```

Cargo runs this build script. It delegates Tauri-specific configuration and platform build preparation to the official helper. No project-specific build generator was added.

### src/lib.rs

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("failed to run the minimal GWA client");
}
```

`run()` is the shared startup function. The mobile annotation is applied when compiling for Tauri's mobile configuration. `Builder::default()` constructs the application, and `generate_context!()` supplies the configured application context and assets.

Startup failures produce the explicit message at the end of the function. There is no `invoke_handler`, plugin registration, or custom application state in this initial host.

### src/main.rs

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    gwa_minimal_lib::run();
}
```

The desktop executable delegates to the shared library. The Windows attribute suppresses the additional console window for a Windows release build; it does not change the Linux or Android build.

### tauri.conf.json

The configuration contains one main window and the existing frontend hooks.

| Setting | Value | Effect in this project |
| --- | --- | --- |
| `productName` | `GWA Minimal` | Human-readable native app name. |
| `version` | `0.0.1` | Native application version. |
| `identifier` | `dev.yrrrrrf.gwa.minimal` | Stable native application identifier. |
| `beforeDevCommand` | `deno task dev` | Starts the minimal frontend before native development. |
| `beforeBuildCommand` | `deno task build` | Builds the minimal frontend before native packaging. |
| `devUrl` | `http://localhost:1420` | Desktop frontend development URL. |
| `frontendDist` | `../build` | Static frontend assets, resolved relative to `src-tauri`. |
| Window label | `main` | Connects the configured window to its capability. |
| Window size | `960 × 640` | Initial desktop window dimensions. |
| Minimum size | `320 × 480` | Desktop resizing limits. |
| `bundle.active` | `false` | Automatic desktop installer generation is disabled. |
| `bundle.icon` | `icons/icon.png` | Native icon source. |
| `bundle.android.minSdkVersion` | `24` | Minimum Android API level requested by this app. |

The desktop build task additionally uses `--no-bundle`. The successful Linux output is the executable itself, rather than a generated desktop installer. The Android task explicitly requests an APK and has successfully produced it.

The hook commands operate on the minimal app. They do not invoke the entire workspace cycle.

The [Tauri configuration reference](https://v2.tauri.app/reference/config/) documents these configuration fields.

### Permissions and content security policy

The main window's capability is embedded directly in `tauri.conf.json`:

```json
{
  "identifier": "main",
  "description": "Core permissions for the local minimal GWA application.",
  "windows": ["main"],
  "permissions": ["core:default"]
}
```

Inlining it avoids a separate capability file. The implementation requests the core default permission set for the window named `main`. It registers no filesystem, shell, HTTP, or other optional plugins.

Capabilities control access to Tauri APIs. The content security policy controls which content and connections the webview can load. They serve different purposes; a CSP allowance does not itself grant a native plugin permission. See [Tauri capabilities](https://v2.tauri.app/security/capabilities/).

The production CSP is:

```text
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' ipc: http://ipc.localhost
```

It permits local application assets, inline styles, data images/fonts, and Tauri IPC connections. It does not currently list external backend origins.

The development CSP is:

```text
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' ipc: http://ipc.localhost http: https: ws: wss:
```

Development permits the HTTP and WebSocket connections used by the development server and hot reload. If a future production feature calls a remote API, its connection requirements must be reflected in the production policy.

### Ignore rules and generated files

The local ignore rules exclude:

- Rust `target/` and generated Tauri schemas.
- Android Gradle and IDE caches.
- Android project and app build output.
- Machine-specific `local.properties` and generated `tauri.properties`.
- Generated Android `jniLibs`.
- `*.jks` and `*.keystore` files.

The local Biome configuration inherits the project setup through `root: false` and excludes the native build output from formatting/linting traversal.

Android initialization creates the official project under `src-tauri/gen/android`. Its source and configuration should be retained in version control after initialization; the ignore rules exclude selected generated/local files rather than the whole Android project. That directory was generated on your machine, so its complete file inventory was not present in the delivered ZIP.

## Frontend integration

### Existing SvelteKit rendering configuration

The app's root layout remains:

```ts
export const prerender = true;
export const ssr = false;
```

Its Vite configuration still uses `@sveltejs/adapter-static`, with `fallback: "index.html"` and `strict: true`. The generated output is `apps/minimal/build`.

Tauri consumes a static frontend. This app already had the required static-output arrangement, so its pages and layout were preserved. A future native API call must execute in a suitable runtime context: prerendering happens during the build, before a native webview exists. The [official SvelteKit integration guide](https://v2.tauri.app/start/frontend/sveltekit/) explains that boundary.

The reported `adapter_fallback_overwrites` message concerns the existing `index.html` fallback arrangement. It did not prevent either successful native build. This integration did not change that arrangement.

### Vite development settings

The relevant file is `apps/minimal/vite.config.mts`. It continues to use the shared `defineGWA` helper and adds app-local server settings:

```ts
const host = env.TAURI_DEV_HOST;
```

| Setting | Effect |
| --- | --- |
| `port: 1420` | Matches the configured desktop development URL. |
| `strictPort: true` | Fails if the port is occupied instead of silently selecting another port. |
| `host: host || "127.0.0.1"` | Uses Tauri's supplied mobile development host when present; otherwise binds to loopback. |
| HMR host with WebSocket port `1421` | Configures mobile development hot reload when a Tauri host is supplied. |
| Ignore `**/src-tauri/**` in Vite's watcher | Keeps Rust and Android changes out of the frontend watcher. |
| `clearScreen: false` | Preserves frontend/native output in the terminal. |

Environment access uses `import { env } from "node:process"`, supported by Deno's Node compatibility layer. It does not require replacing Deno with Node as the task runner.

### TypeScript support

The minimal app imports `@types/node` using `npm:@types/node@^24.0.0`. Its TypeScript `types` array contains `"$app/types"`, `"node"`, and `"vite/client"`.

These retain the app framework types, add types for the Node-compatible environment import, and retain Vite's client types. The SDK aliases and existing workspace configuration remain in place.

## NixOS development environments

The existing `client/flake.nix` now exposes three named environments.

| Environment | Use |
| --- | --- |
| `nix develop` | Original frontend/workspace development environment. |
| `nix develop .#desktop` | Original tools plus Rustup and Linux desktop development dependencies. |
| `nix develop .#android` | Original tools plus Rustup, JDK, Android SDK, and NDK. |

The two native shells inherit the original tool inputs. Selecting them makes their tools and variables available to that shell session. This flow does not require adding all native build dependencies permanently to your NixOS system configuration.

### Desktop shell and the D-Bus correction

The desktop shell supplies Rustup and `pkg-config`. On Linux its build inputs include:

| Package | Purpose |
| --- | --- |
| `gtk3` | GTK desktop window dependencies. |
| `glib` | GLib development support. |
| `dbus` | D-Bus development metadata needed by the dependency that failed initially. |
| `webkitgtk_4_1` | Linux webview dependencies. |
| `libsoup_3` | Networking dependencies used by the GTK/WebKit stack. |
| `openssl` | TLS/crypto development support. |
| `librsvg` | SVG support in the desktop environment. |
| `glib-networking` | GLib networking modules. |
| `gsettings-desktop-schemas` | Desktop settings schemas. |

The shell also prepares `XDG_DATA_DIRS` for GSettings schemas and `GIO_EXTRA_MODULES` for GLib networking.

The first desktop attempt failed because `libdbus-sys` could not discover `dbus-1.pc`. Adding `dbus` to the shell's `buildInputs` corrected the missing development dependency. The successful Linux release build confirms the corrected environment worked on your machine.

On NixOS, a library being available to the operating system does not by itself establish the development environment needed by `pkg-config`. Enter the correct shell and verify discovery there rather than inventing store paths for `PKG_CONFIG_PATH`.

Rustup uses the toolchain selected on your machine. This integration does not add a separate compiler toolchain file.

### Android shell

The Android shell composes a Nix-managed SDK and supplies:

| Tool/component | Configured version |
| --- | --- |
| JDK | `21` |
| SDK platform | `37.0` |
| Build tools | `37.0.0` |
| Command-line tools | `22.0` |
| Platform tools | `37.0.1` |
| NDK | `29.0.14206865` |

Its environment sets:

| Variable | Role |
| --- | --- |
| `JAVA_HOME` | Selects the Nix-provided JDK. |
| `ANDROID_HOME` | Points to the composed SDK. |
| `NDK_HOME` | Points to the selected SDK's NDK directory. |
| `ANDROID_NDK_ROOT` | Provides the same NDK path for tooling that reads this variable. |
| `GRADLE_OPTS` | Points Gradle's AAPT2 override at the Nix-packaged executable. |

The flake creates an `android-37` alias for the SDK's `android-37.0` directory to match the compile SDK value emitted by the pinned CLI. It also selects Nix-packaged AAPT2 to accommodate NixOS executable-loader paths.

The Android-specific nixpkgs import enables unfree packages and SDK license acceptance for this SDK composition. The SDK does not include CMake, an emulator, or emulator system images.

Your JetBrains Toolbox Android Studio installation can remain available for the IDE and an existing emulator. The project's Android shell uses its own SDK; installing Studio does not replace the shell's explicit SDK/NDK/JDK selection. The first shell activation may download these tools. Reusing Studio's SDK would be an alternative environment setup, not a change made by this implementation.

SDK component versions are explicit in the flake. Full Nix dependency reproducibility also depends on retaining the generated `flake.lock`, because the input references a moving `nixos-unstable` branch.

## Android APK details

The app-local debug build task expands to:

```text
deno task tauri android build --debug --apk --target aarch64
```

`--debug` selects a debug build, `--apk` requests APK output, and `--target aarch64` selects ARM64 native code. The [Tauri CLI reference](https://v2.tauri.app/reference/cli/#android-build) describes these options.

Your generated output is:

```text
apps/minimal/src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk
```

The `universal` directory and filename do not establish which architectures were included. The build task explicitly requested ARM64; no claim that all four Android architectures were packaged follows from that filename.

The debug APK is the current local testing artifact. A release task also exists, but a release build does not create a distribution signing setup automatically. Configure release signing in the generated Android project before distributing a release APK; see [Tauri Android signing](https://v2.tauri.app/distribute/sign/android/).

## Pipeline and exit criterion

The root Justfile still uses Nushell and imports the existing script layers. The native addition did not replace its validation rules.

The existing `cycle` recipe is:

```just
cycle: prepare (ci "-vp") build
```

The `ci` recipe runs the existing test and check recipes. The check recipe includes formatting, linting, and type checks. The build recipe builds the workspace applications. The original lint invocation retains its existing ignored-error behavior; the Tauri addition does not tighten or reinterpret that gate.

The app-local native extension is exactly:

```text
just --justfile ../../justfile cycle && deno task tauri:fmt && deno task tauri:android:build
```

Run it from `apps/minimal`. It performs three sequential stages:

1. The original workspace cycle.
2. Rust formatting verification.
3. The minimal Android debug APK build.

Each later stage runs only when the previous command succeeds. The Rust formatting task uses `--check`; it does not rewrite Rust files.

The native before-build hook runs `deno task build` only. Calling the native cycle from that hook would recurse when the cycle reached its Android build step.

A successful standalone APK build confirms the native packaging path. It does not prove that every other application in the workspace passed the existing cycle. That full cycle remains the agreed exit criterion.

## Commands

Run the commands one at a time. Folder changes matter: Nix shell selection belongs at the `client` root; app-local Deno tasks belong in `client/apps/minimal`.

The commands below work as external commands from Nushell and in the Bash session normally opened by `nix develop`. Nushell-specific troubleshooting is labeled separately. APK searches use `fd`.

### 1. Go to the client root

For your current downloaded copy:

```sh
cd ~/Downloads/gwa-client-minimal-tauri/client
```

If you move the project, use its new client-root path.

### 2. Enter or leave a development shell

Original frontend environment, from the client root:

```sh
nix develop
```

Desktop environment, from the client root:

```sh
nix develop .#desktop
```

Android environment, from the client root:

```sh
nix develop .#android
```

Choose the environment needed for the current work. To leave the current development shell:

```sh
exit
```

Use `exit` only when you intend to leave that shell. To switch from desktop to Android, exit the desktop shell, go back to the client root, and enter `.#android`.

### 3. Check the selected Rust toolchain

```sh
rustup show active-toolchain
```

```sh
rustc --version
```

```sh
cargo --version
```

Additional runtime checks:

```sh
deno --version
```

```sh
node --version
```

In the Android shell:

```sh
java -version
```

### 4. Verify desktop dependency discovery

Run inside `nix develop .#desktop`:

```sh
pkg-config --modversion gtk+-3.0 webkit2gtk-4.1 libsoup-3.0
```

The D-Bus correction check used after updating the flake:

```sh
pkg-config --modversion dbus-1 gtk+-3.0 webkit2gtk-4.1
```

Both commands should print package versions rather than missing-package errors.

### 5. Select the minimal app

From the client root:

```sh
cd apps/minimal
```

To return from `apps/minimal` to the client root:

```sh
cd ../..
```

### 6. Run the existing frontend by itself

From `apps/minimal`, in the original or suitable native development shell:

```sh
deno task dev
```

Stop development with Ctrl+C before starting another server on the same port.

Build its static output:

```sh
deno task build
```

### 7. Desktop development, release build, and launch

From `apps/minimal`, inside the desktop shell:

```sh
deno task tauri:dev
```

Stop development with Ctrl+C when finished.

Build the Linux release executable:

```sh
deno task tauri:build
```

Launch the confirmed executable from `apps/minimal`:

```sh
./src-tauri/target/release/gwa-minimal
```

Close its window before continuing terminal instructions.

### 8. Android first-time preparation

From `apps/minimal`, inside the Android shell, install the Rust targets:

```sh
deno task tauri:android:targets
```

That task installs these four targets:

```sh
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```

Use the task or its expanded command; running both is unnecessary.

Initialize the Android project:

```sh
deno task tauri:android:init
```

If the targets are already installed, the underlying initialization command can skip target installation:

```sh
deno task tauri android init --skip-targets-install
```

Initialization is a first-time step. Your current project has already built its APK, so ordinary rebuilds do not require repeating it.

### 9. Build the Android debug APK

From `apps/minimal`, inside the Android shell:

```sh
deno task tauri:android:build
```

This runs the frontend before-build hook automatically; a separate preceding `deno task build` is unnecessary for the normal native build.

### 10. Locate the APK with fd

From the client root, use the exact command that found your APK:

```sh
fd --no-ignore --type f --extension apk . apps/minimal/src-tauri/gen/android/app/build/outputs
```

From `apps/minimal`, use the shorter relative path:

```sh
fd --no-ignore --type f --extension apk . src-tauri/gen/android/app/build/outputs
```

The flags mean:

| Argument | Meaning |
| --- | --- |
| `--no-ignore` | Search ignored build directories too. |
| `--type f` | Return files. |
| `--extension apk` | Match the APK extension. |
| `.` | Match filenames broadly; this is the search-pattern argument. |
| Final path | Directory to search. |

Your confirmed result, when searching from the client root:

```text
apps/minimal/src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk
```

Plain `fd apk` can omit ignored build output. `rg apk` searches file contents, so it can find task definitions or bundled JavaScript mentioning APKs without locating an APK artifact. The [fd documentation](https://github.com/sharkdp/fd#how-to-use) covers patterns, roots, extensions, and ignored files.

### 11. Android development on a device or existing emulator

From `apps/minimal`, inside the Android shell:

```sh
deno task tauri:android:dev
```

This starts the development workflow. It requires an available device or emulator. The project's Android shell does not download emulator images.

### 12. Choose another Android architecture

For an x86_64 emulator, from `apps/minimal`:

```sh
deno task tauri android build --debug --apk --target x86_64
```

The normal app task remains ARM64. Using the underlying CLI allows a different target without editing the task.

### 13. Check Rust formatting

From `apps/minimal`:

```sh
deno task tauri:fmt
```

Equivalent expanded command:

```sh
cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check
```

### 14. Run the existing workspace cycle

From the client root:

```sh
just cycle
```

This retains the original workspace validation behavior.

### 15. Run the complete Android extension of the cycle

From `apps/minimal`, inside the Android shell:

```sh
deno task tauri:android:cycle
```

Its expanded command is:

```sh
just --justfile ../../justfile cycle && deno task tauri:fmt && deno task tauri:android:build
```

Use the task for normal work. The expansion documents its exact three stages.

### 16. Build an Android release APK

After configuring release signing, from `apps/minimal`:

```sh
deno task tauri:android:release
```

Equivalent underlying command:

```sh
deno task tauri android build --apk --target aarch64
```

This release path has not yet been reported as tested.

### 17. Inspect the native environment

From `apps/minimal`:

```sh
deno task tauri info
```

Check the available search tools if needed:

```sh
rg --version
```

```sh
fd --version
```

For a Nushell session specifically, inspect the selected Android environment:

```nu
$env.ANDROID_HOME
```

```nu
$env.NDK_HOME
```

```nu
$env.JAVA_HOME
```

These variable expressions are Nushell syntax, rather than Bash commands.

## Troubleshooting the issues encountered

| Symptom | Cause or interpretation | Action |
| --- | --- | --- |
| GTK, WebKitGTK, or libsoup cannot be found by `pkg-config` | Required development dependencies are absent from the current shell environment. | Enter `.#desktop` and run the package checks from Commands. |
| `libdbus-sys` cannot find `dbus-1.pc` | The initial desktop shell omitted the D-Bus development input. | Use the corrected flake, leave the old shell, re-enter `.#desktop`, and check `dbus-1`. |
| Desktop build succeeds but no APK appears | The desktop task generated a Linux executable. | Run the Android build task inside `.#android`. |
| `fd apk` returns no result after a build | Default ignore filtering can exclude the build directory. | Use the full `fd --no-ignore --type f --extension apk` command. |
| Nushell rejects GNU-style flags on `find` | Nushell resolves its built-in `find`, which has a different command contract. | Use the documented `fd` command. |
| APK search reports that its directory does not exist | The current folder is wrong or Android output has not been generated there. | Use the matching root/app path and confirm the Android build finished. |
| Vite reports port 1420 is occupied | `strictPort` intentionally prevents silently using another port. | Stop the existing server before rerunning development. |
| Native cycle stops before Android compilation | An earlier workspace or formatting stage failed. | Resolve that stage's error; later stages are conditional on success. |

The [Nushell external-command guide](https://www.nushell.sh/book/running_externals.html) explains command resolution and how external programs differ from built-ins.

The supplied source export omitted the other applications' original React, Vue, Svelte, and Vision images. The earlier full-cycle attempt stopped on missing assets in other apps. Preserve or restore those original assets when using the reconstructed archive; a successful minimal APK does not repair unrelated application inputs.

## Verification record and maintenance

The earlier implementation checks reported a successful minimal frontend production build, its existing Vitest test, zero-error Svelte diagnostics, Rust formatting, Clippy with warnings denied, and a Linux native debug build. Both named shells were initially evaluated as Nix derivations. The D-Bus omission was then corrected in the desktop shell.

Your subsequent output confirms a Linux release build and an Android debug APK at the paths recorded at the beginning of this document. The complete workspace cycle, phone runtime behavior, and release distribution remain separate checks.

For ongoing work:

- Keep frontend changes in the existing minimal app source.
- Keep native startup, native configuration, and future native features in `src-tauri`.
- Retain Cargo and Nix lockfiles to preserve resolved inputs.
- Retain the generated Android project's source/configuration, excluding its ignored build and local files.
- Use the named shell appropriate to the target.
- Use `deno task tauri:android:cycle` to validate the original workspace and the Android addition together.
- Add permissions and production connection origins when actual new features require them.

This document records the implemented configuration and successful outputs; it does not modify the application, the shared pipeline, or the generated Android project.

