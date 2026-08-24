# [[vite-plus]] [[config-and-build]]

> [!abstract] Purpose
> Complete technical reference for `vite.config.ts` configuration, Vite dev server, Rolldown production bundling engine, `tsdown` library packaging, SSR workflows, and plugin integration.

## ⚡ Config & Build Reference

### 1. Full `vite.config.ts` Unified Schema

```ts
import { defineConfig } from 'vite-plus'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Root and Base Path
  root: '.',
  base: '/',
  mode: 'development', // 'development' | 'production'

  // Plugin Pipeline (100% Vite / Rollup plugin compatible)
  plugins: [
    react({
      babel: { plugins: [] }
    })
  ],

  // Dev Server Configuration
  server: {
    port: 3000,
    strictPort: true,
    host: '0.0.0.0',
    cors: true,
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true
      }
    },
    hmr: {
      overlay: true,
      port: 3000
    }
  },

  // Production Build Options (Powered by Rolldown)
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsDir: 'assets',
    assetsInlineLimit: 4096, // 4kb threshold for base64 inlining
    cssCodeSplit: true,
    sourcemap: true,
    minify: 'oxc', // 'oxc' | 'esbuild' | 'terser' | false
    manifest: true, // Generate manifest.json for backend asset mapping
    ssrManifest: false,
    emptyOutDir: true,
    
    // Rolldown / Rollup Output Options
    rollupOptions: {
      input: {
        main: './index.html'
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react'
            return 'vendor'
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },

  // Library Mode Bundling (Powered by tsdown)
  lib: {
    entry: ['src/index.ts', 'src/cli.ts'],
    formats: ['es', 'cjs'],
    fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'js' : 'cjs'}`,
    dts: {
      isolatedDeclarations: true // Ultra-fast Rust-based DTS emit via Oxc
    },
    bundleless: false,
    clean: true
  },

  // Module Resolution
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components'
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
    conditions: ['import', 'module', 'browser', 'default']
  },

  // Dependency Pre-Bundling
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['@scope/workspace-pkg'],
    force: false
  },

  // CSS & Preprocessor Options
  css: {
    transformer: 'lightningcss', // 'lightningcss' | 'postcss'
    lightningcss: {
      targets: { chrome: 110, firefox: 110, safari: 16 }
    },
    devSourcemap: true
  },

  // Server-Side Rendering (SSR) Configuration
  ssr: {
    noExternal: ['lodash-es'],
    external: ['better-sqlite3'],
    target: 'node' // 'node' | 'webworker'
  }
})
```

---

### 2. Rolldown Bundler Options & Features

Rolldown is VoidZero's Rust-native Rollup replacement, delivering 10x-30x faster builds while maintaining Rollup plugin API compatibility.

| Feature / Option | Rolldown Implementation | Advantage over Rollup / Webpack |
| :--- | :--- | :--- |
| **Parsing & Ast** | Native Rust parser via Oxc | Multi-threaded parallel file parsing |
| **Treeshaking** | Rust-native symbol table analysis | Dead code elimination across dynamic ESM graphs |
| **Minification** | Oxc minifier / oxc-transform | Near-instant JS/TS compression without node process overhead |
| **Source Maps** | Paralleled binary source-map merging | Zero-overhead accurate line/column mapping |
| **Dual CJS/ESM Output** | Native wrapper generation | Zero syntax ambiguity or default import breakage |

```ts
// Advanced Rolldown-Specific Configuration in vite.config.ts
export default defineConfig({
  build: {
    rolldownOptions: {
      treeshake: {
        moduleSideEffects: 'no-external',
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false
      },
      transform: {
        target: 'es2022',
        jsx: 'automatic',
        jsxImportSource: 'react'
      }
    }
  }
})
```

---

### 3. Library Packaging with `tsdown`

`tsdown` is the integrated library builder in Vite+ designed for authoring npm packages and workspace components.

```bash
# Package the library defined in vite.config.ts#lib
vp pack

# Watch mode during development
vp pack --watch

# Emit type definitions and clean outDir
vp pack --dts --clean
```

#### Dual-Format Output Comparison:

| Target File | Format | Export Specifier Mapping |
| :--- | :--- | :--- |
| `dist/index.js` | ES Module (`esm`) | `"import": "./dist/index.js"` |
| `dist/index.cjs` | CommonJS (`cjs`) | `"require": "./dist/index.cjs"` |
| `dist/index.d.ts` | TypeScript Declarations | `"types": "./dist/index.d.ts"` |
| `dist/index.d.ts.map` | Declaration Maps | Source map navigation in IDEs |

---

### 4. CSS, Lightning CSS & Tailwind CSS v4 Integration

```ts
// vite.config.ts with Tailwind CSS v4 & Lightning CSS
import { defineConfig } from 'vite-plus'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss()
  ],
  css: {
    transformer: 'lightningcss'
  }
})
```

```css
/* src/styles.css */
@import "tailwindcss";

@layer components {
  .btn-primary {
    background-color: var(--color-primary);
    color: var(--color-primary-content);
  }
}
```

---

### 5. Server-Side Rendering (SSR) Build Architecture

```bash
# 1. Build Client Bundle (HTML + Client Hydration Assets)
vp build --outDir dist/client

# 2. Build Server SSR Entry (Node / Worker Target)
vp build --ssr src/entry-server.ts --outDir dist/server
```

```ts
// src/entry-server.ts
import { renderToString } from 'react-dom/server'
import { App } from './App'

export function render(url: string) {
  const html = renderToString(<App url={url} />)
  return { html }
}
```

---

## 📋 Rules & Invariants

1. **Rollup API Compatibility:** Rolldown adheres to Rollup's plugin hook model (`resolveId`, `load`, `transform`, `renderChunk`, `generateBundle`), allowing existing Vite plugins to function out of the box.
2. **Deterministic Module Identity:** Asset paths and chunk names use cryptographic content hashes (`[name]-[hash].js`), ensuring immutable HTTP caching in production CDNs.
3. **Pure ESM Development Lifecycle:** `vp dev` performs zero pre-bundling of application code; transforms occur on-demand per browser HTTP request via Oxc.
4. **Isolated Declarations Constraint:** When `dts: { isolatedDeclarations: true }` is enabled in `tsdown`, all exported functions and classes must declare explicit return types to permit parallel Rust DTS generation.
5. **Base URL Normalization:** `base` must start and end with `/` (e.g., `'/app/'`) unless relative base (`'./'` or `''`) is explicitly desired for embedded webviews.

---

## ⚠️ Gotchas & Fixes

**Rolldown & Bundling**
- ❌ `RolldownError: [UNRESOLVED_IMPORT] Could not resolve 'missing-dep' from 'src/main.ts'`
  - **Cause:** Typo in import specifier or uninstalled dependency.
  - **Fix:** Install package via `vp add missing-dep` or check `resolve.alias` configuration.
- ❌ `RolldownError: Top-level await is not supported with the configured output target 'cjs'`
  - **Cause:** Using `await` at module root when targeting CommonJS format.
  - **Fix:** Restrict `top-level await` modules to ESM format only (`formats: ['es']`), or wrap in an `async function main()`.

**`tsdown` & Type Declaration Emit**
- ❌ `Error: [isolatedDeclarations] Function 'calculateTotal' must have an explicit return type`
  - **Cause:** `tsdown` fast DTS generation requires explicit return types on public library exports.
  - **Fix:** Add return type: `export function calculateTotal(items: Item[]): number { ... }`.

**SSR & Asset Loading**
- ❌ `ReferenceError: window is not defined`
  - **Cause:** Browser-specific API accessed at the root of a module evaluated in SSR bundle.
  - **Fix:** Guard with `if (typeof window !== 'undefined')` or run client-only logic inside `useEffect` / `onMounted`.
