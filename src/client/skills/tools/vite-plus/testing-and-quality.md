# [[vite-plus]] [[testing-and-quality]]

> [!abstract] Purpose
> Complete technical reference for Vite+ integrated quality toolchain: Oxlint (Rust linter), Oxfmt (Rust formatter), Vitest (test runner), typecheck pipelines, and code coverage.

## ⚡ Testing & Quality Reference

### 1. Quality & Testing Configuration in `vite.config.ts`

```ts
// vite.config.ts — Quality & Testing Section
import { defineConfig } from 'vite-plus'

export default defineConfig({
  // ── 1. OXLINT CONFIGURATION (Rust-Native Linter) ──────────────────────
  lint: {
    // Target globs and ignore patterns
    include: ['src/**/*.{ts,tsx,js,jsx}'],
    exclude: ['node_modules', 'dist', '**/*.d.ts'],
    
    // Category-level presets
    categories: {
      correctness: 'error',  // Detects bugs, syntax errors, bad runtime access
      suspicious: 'warn',    // Questionable code patterns likely to cause issues
      perf: 'warn',          // Performance antipatterns (allocations, clone)
      pedantic: 'off',       // Strict rules
      style: 'off'           // Stylistic choices (handled by Oxfmt instead)
    },

    // Plugin Enablement (Rust equivalents of popular ESLint plugins)
    plugins: ['typescript', 'react', 'unicorn', 'import', 'vitest', 'jsx-a11y'],

    // Specific Rule Overrides
    rules: {
      'no-unused-vars': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'typescript/no-explicit-any': 'warn',
      'react/button-has-type': 'error',
      'react/jsx-key': 'error'
    },

    // Engine Options
    options: {
      typeCheck: true, // Deep type-aware linting via Oxc
      denyWarnings: false
    }
  },

  // ── 2. OXFMT CONFIGURATION (Rust-Native Formatter) ────────────────────
  fmt: {
    include: ['src/**/*.{ts,tsx,js,jsx,json,css,html,md}'],
    exclude: ['dist', 'node_modules'],
    
    // Formatting Options (100% Prettier compatibility)
    printWidth: 100,
    tabWidth: 2,
    useTabs: false,
    semi: false,
    singleQuote: true,
    trailingComma: 'none',
    bracketSpacing: true,
    bracketSameLine: false,
    arrowParens: 'always',
    proseWrap: 'preserve'
  },

  // ── 3. VITEST CONFIGURATION (Test Engine) ─────────────────────────────
  test: {
    globals: true,
    environment: 'happy-dom', // 'node' | 'jsdom' | 'happy-dom' | 'edge-runtime'
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    setupFiles: ['./src/test/setup.ts'],
    
    // Isolation and Concurrency
    isolate: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true
      }
    },

    // Code Coverage via V8
    coverage: {
      enabled: false,
      provider: 'v8', // 'v8' | 'istanbul'
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      }
    },

    // Snapshot Configuration
    resolveSnapshotPath: (testPath, snapExtension) =>
      testPath.replace(/\.test\.([tj]sx?)/, `.snap.${snapExtension}`)
  }
})
```

---

### 2. `vp check` Quality Command Matrix

| Command | Action Performed | Speed / Performance |
| :--- | :--- | :--- |
| `vp check` | Runs Oxlint linter + Oxfmt format check | Sub-second across 50k+ LOC |
| `vp check --fix` | Auto-fixes lint violations + reformats in-place | Instantaneous AST rewrite |
| `vp check --typecheck` | Oxlint + Oxfmt + full TypeScript type checking | Fast parallelized type check |
| `vp check --staged` | Scans only Git staged files (pre-commit hook) | `< 50ms` execution |
| `vp check --verbose` | Prints detailed timing breakdowns per file | Diagnostic profiling |

---

### 3. Oxlint Built-in Plugins & Rule Groups

| Plugin | Scope & Rules Supported | Equivalent ESLint Plugin |
| :--- | :--- | :--- |
| `typescript` | Type safety, interface definitions, enum usage | `@typescript-eslint/eslint-plugin` |
| `react` | Hooks rules, JSX key enforcement, state purity | `eslint-plugin-react` + `eslint-plugin-react-hooks` |
| `jsx-a11y` | Accessibility attributes, ARIA roles, image alt tags | `eslint-plugin-jsx-a11y` |
| `unicorn` | Modern JavaScript idioms, regex safety | `eslint-plugin-unicorn` |
| `import` | Import ordering, duplicate specifiers, cycle alerts | `eslint-plugin-import` |
| `vitest` | Assertion validation, expect assertions, test naming | `eslint-plugin-vitest` |

---

### 4. Vitest Testing Patterns & Recipes

```ts
// src/components/Counter.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Counter } from './Counter'

describe('Counter Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('increments count on click', () => {
    render(<Counter initial={0} />)
    const button = screen.getByRole('button', { name: /increment/i })
    
    expect(screen.getByText('Count: 0')).toBeInTheDocument()
    fireEvent.click(button)
    expect(screen.getByText('Count: 1')).toBeInTheDocument()
  })

  it('calls onUpdate callback when state changes', () => {
    const onUpdate = vi.fn()
    render(<Counter initial={5} onUpdate={onUpdate} />)
    
    fireEvent.click(screen.getByRole('button', { name: /increment/i }))
    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(onUpdate).toHaveBeenCalledWith(6)
  })
})
```

#### In-Source Testing (Zero Overhead in Production Builds)

```ts
// src/utils/math.ts
export function add(a: number, b: number): number {
  return a + b
}

// In-source test suite stripped during production builds
if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest
  it('adds two numbers correctly', () => {
    expect(add(2, 3)).toBe(5)
  })
}
```

```ts
// Enable in vite.config.ts
export default defineConfig({
  define: {
    'import.meta.vitest': 'undefined' // Stripped in production
  },
  test: {
    includeSource: ['src/**/*.{js,ts}']
  }
})
```

---

### 5. Mocking Strategies in Vitest

```ts
import { vi, describe, it, expect } from 'vitest'
import { fetchData } from './api'
import axios from 'axios'

// Mock entire module
vi.mock('axios')

describe('API Fetcher', () => {
  it('returns parsed payload on HTTP 200', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({ data: { user: 'Alice' } })
    
    const result = await fetchData('/user')
    expect(result).toEqual({ user: 'Alice' })
    expect(axios.get).toHaveBeenCalledWith('/user')
  })
})
```

---

## 📋 Rules & Invariants

1. **AST-Level Verification:** Oxlint and Oxfmt operate on Oxc's native Rust Abstract Syntax Tree, guaranteeing lossless and deterministic AST serialization.
2. **Pure Plugin Compatibility:** Vitest inherits all Vite transforms, CSS modules, and custom plugins configured in `vite.config.ts` without requiring Babel or duplicate configs.
3. **No Stylistic Lint Duplication:** Formatting rules (semicolons, indentation, quotes) must be delegated to `fmt` (Oxfmt); `lint` (Oxlint) should be restricted to `correctness`, `suspicious`, and `perf` categories.
4. **Isolated Test Sandboxing:** When `isolate: true` is configured, each test file runs in its own V8 context / worker thread to prevent cross-test global mutation leaks.
5. **Deterministic Typechecking:** `vp check --typecheck` invokes TypeScript's type checker in `--noEmit` mode alongside Oxlint, preventing non-typechecked code from reaching CI.

---

## ⚠️ Gotchas & Fixes

**Oxlint & Code Quality**
- ❌ `OxlintError: [no-unused-vars] Variable 'temp' is declared but never used`
  - **Cause:** Variable declared without usage.
  - **Fix:** Prefix unused variables with an underscore (`_temp`) or remove them. Run `vp check --fix` for automatic cleanup.
- ❌ `OxlintError: Failed to parse JSX syntax in file 'src/utils.ts'`
  - **Cause:** File contains JSX markup but has a `.ts` extension instead of `.tsx`.
  - **Fix:** Rename file to `src/utils.tsx`.

**Vitest & Environment**
- ❌ `Error: document is not defined in test`
  - **Cause:** DOM-dependent test executed with default `'node'` environment.
  - **Fix:** Set `test.environment: 'happy-dom'` or `'jsdom'` in `vite.config.ts`, or add `// @vitest-environment happy-dom` at the top of the test file.
- ❌ `Error: vi.mock hoisted factory cannot access outer scope variables`
  - **Cause:** `vi.mock` is hoisted to the top of the file before lexical variables are initialized.
  - **Fix:** Use `vi.hoisted()` to define variables that must be accessible inside `vi.mock` factories:
    ```ts
    const { mockMethod } = vi.hoisted(() => ({ mockMethod: vi.fn() }))
    vi.mock('./module', () => ({ default: mockMethod }))
    ```

**Typechecking**
- ❌ `TypeScriptError: Cannot find name 'describe'. Do you need to install type definitions for a test runner?`
  - **Cause:** `globals: true` is enabled in Vitest config, but `tsconfig.json` lacks `"types": ["vitest/globals"]`.
  - **Fix:** Add `"compilerOptions": { "types": ["vitest/globals"] }` to `tsconfig.json`.
