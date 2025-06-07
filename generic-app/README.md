# GWA Generic App (Frontend & Desktop)

This directory houses the frontend application for the General Web App (GWA), built with **[SvelteKit](https://kit.svelte.dev/)**, **[TypeScript](https://www.typescriptlang.org/)**, and styled with **[TailwindCSS](https://tailwindcss.com/)**. It leverages **[Deno](https://deno.land/)** as its JavaScript/TypeScript runtime and build tool. Additionally, it integrates with **[Tauri](https://tauri.app/)** to package the application as a cross-platform desktop app.

## Overview

The Generic App provides a modern, reactive user interface that interacts with the [**GWA Backend API** (`/server/api/`)](/server/api/).

*   **Framework:** [SvelteKit](https://kit.svelte.dev/) with [Svelte 5](https://svelte.dev/blog/runes) (utilizing Runes for reactivity).
*   **Language:** [TypeScript](https://www.typescriptlang.org/).
*   **Runtime & Tooling:** [Deno](https://deno.land/). Project tasks and dependencies are managed via [`deno.json`](deno.json).
*   **Styling:** [TailwindCSS](https://tailwindcss.com/) with the [DaisyUI](https://daisyui.com/) component library. Base styles and plugins are configured in [`src/style.css`](./src/style.css).
*   **Desktop Packaging:** [Tauri](https://tauri.app/) (v2). Configuration and Rust backend for Tauri are in [`src-tauri/`](./src-tauri/).
*   **Build Tool:** [Vite](https://vitejs.dev/), as configured in [`vite.config.ts`](./vite.config.ts).
*   **Dockerization:** Can be containerized using [`app.Dockerfile`](./app.Dockerfile) for web deployments.

## Key Features

*   **Reactive UI:** Built with Svelte 5's powerful and intuitive reactivity model.
*   **Type Safety:** TypeScript is used throughout the SvelteKit application.
*   **Deno-Powered Workflow:** All development tasks (dev, build, check, preview, Tauri commands) are executed using Deno, as defined in [`deno.json`](./deno.json).
*   **Cross-Platform Desktop App:** Seamlessly package as a desktop application using Tauri. See an example of Tauri interaction in [`src/lib/TauriGreet.svelte`](./src/lib/TauriGreet.svelte) and its Rust counterpart in [`src-tauri/src/lib.rs`](./src-tauri/src/lib.rs).
*   **Static Site Generation (SSG):** Configured for prerendering for Tauri and static deployments, as seen in [`src/routes/+layout.server.ts`](./src/routes/+layout.server.ts).

## Getting Started

Ensure you have [Deno](https://deno.land/) installed. For Tauri desktop builds, [Rust](https://www.rust-lang.org/) (version 1.76 or higher) and its prerequisites are also required.

1.  **Navigate to this directory:**
    ```bash
    cd generic-app
    ```

2.  **Initialize & Start Development Server:**
    Deno tasks defined in [`deno.json`](./deno.json) will handle dependency caching and `node_modules` creation if needed.
    ```bash
    deno task dev
    ```
    This will typically start the SvelteKit development server on [`http://localhost:1420`](http://localhost:1420) (for Tauri compatibility) or another port if configured.

3.  **Other Common Deno Tasks:**
    *   **Build for Production (Web):**
        ```bash
        deno task build
        ```
        Output will be in the `build/` directory (or as configured in [`src-tauri/tauri.conf.json`](./src-tauri/tauri.conf.json) under `frontendDist`).
    *   **Preview Production Build (Web):**
        ```bash
        deno task preview
        ```
    *   **Build Tauri Desktop App:**
        ```bash
        deno task tauri build
        ```
    *   **Run Tauri Desktop App in Development Mode:**
        ```bash
        deno task tauri dev
        ```

## Project Structure Highlights

*   [`deno.json`](./deno.json): Deno configuration, task runner scripts, and npm dependencies.
*   [`svelte.config.js`](./svelte.config.js): SvelteKit configuration, including adapter settings.
*   [`vite.config.ts`](./vite.config.ts): Vite build tool configuration.
*   [`tsconfig.json`](./tsconfig.json): TypeScript compiler options.
*   [`src/`](./src/): Main SvelteKit application code.
    *   [`src/routes/`](./src/routes/): Defines the pages and layouts of the application.
    *   [`src/lib/`](./src/lib/): Shared Svelte components and TypeScript modules.
    *   [`src/app.html`](./src/app.html): The main HTML shell for the application.
*   [`src-tauri/`](./src-tauri/): Tauri-specific code and configuration.
    *   [`src-tauri/tauri.conf.json`](./src-tauri/tauri.conf.json): Core Tauri application settings.
    *   [`src-tauri/Cargo.toml`](./src-tauri/Cargo.toml): Rust dependencies for the Tauri backend.
    *   [`src-tauri/src/main.rs`](./src-tauri/src/main.rs) & [`src-tauri/src/lib.rs`](./src-tauri/src/lib.rs): Rust entry points and command handlers.
*   [`static/`](./static/): Static assets for the SvelteKit application.
*   [`app.Dockerfile`](./app.Dockerfile): Docker configuration for deploying the SvelteKit app as a web service.

## IDE Setup

For an optimal development experience, consider using [VS Code](https://code.visualstudio.com/) with the following extensions:
*   [Svelte for VS Code](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode)
*   [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
*   [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) (if working on the Tauri Rust backend)
*   [Deno extension for VS Code](https://marketplace.visualstudio.com/items?itemName=denoland.vscode-deno)