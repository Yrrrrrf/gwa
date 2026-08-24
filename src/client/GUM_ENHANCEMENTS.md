# Charmbracelet Gum Enhancements for GWA Client Scripts

This document outlines proposed CLI and UX enhancements for the `scripts/*.just` recipe suite using **[Charmbracelet Gum](https://github.com/charmbracelet/gum)** in conjunction with **Nushell** (`set shell := ["nu", "-c"]`).

---

## 🧭 Overview & Current State

- **Current shell runtime**: Nushell (`nu -c`) configured via `client.just`.
- **Existing `gum` usage**:
  - `scripts/_shared.just`: `menu` recipe uses `^gum filter` for basic recipe name search.
  - `scripts/_shared.just`: `_banner` helper uses `^gum style`, but is currently unused in any recipes.
  - All other justfiles (`check.just`, `dev.just`, `test.just`, `deploy.just`) use raw CLI invocations without progress feedback, interactive selections, or safety confirmations.

---

## 💡 Enhancement Proposals by Category

### 1. Safety Guards for Destructive Actions (`gum confirm`)

#### A. Guard `prune` in `scripts/dev.just`
- **Problem**: `prune` unconditionally deletes `node_modules`, `.svelte-kit`, `.vite`, and `deno.lock`.
- **Enhancement**: Add interactive confirmation when executed in a TTY, while allowing a `--force` flag for headless/CI workflows.
```nu
[doc('Prune all node_modules, .svelte-kit, .vite, deno.lock')]
[group('dev')]
prune force="false":
    #!/usr/bin/env nu
    if ("{{ force }}" != "true") and (is-terminal --stdin) {
        if not (^gum confirm --default=false "Prune node_modules, caches, and deno.lock?" | complete | $in.exit_code == 0) {
            ^gum log --level warn "Prune cancelled."
            exit 0
        }
    }
    fd -u --prune '^(node_modules|\.svelte-kit|\.vite|deno\.lock)$' | lines | each {|p| rm -r -f $p }
    ^gum log --level info "Prune completed"
```

#### B. Pre-deployment Confirmation in `scripts/deploy.just`
- **Enhancement**: Guard `publish` with a check for clean working tree and user confirmation.
```nu
[doc('Publish build release')]
[group('deploy')]
publish: _clean-tree ci build
    #!/usr/bin/env nu
    if (is-terminal --stdin) {
        if not (^gum confirm "Proceed with publishing release?" | complete | $in.exit_code == 0) {
            ^gum log --level warn "Publish aborted."
            exit 0
        }
    }
    ^gum style --foreground 48 --bold "✓ Release published successfully"
```

---

### 2. Dynamic Selection Pickers (`gum choose` & `gum filter`)

#### A. Dynamic App Selector for `run`, `build`, and `preview`
- **Problem**: Recipes currently hardcode `app='vision'`.
- **Enhancement**: If no `app` argument is provided, dynamically list folders inside `apps/` and allow the user to select one interactively with `gum choose`.
```nu
[doc('Run an app on the dev server')]
[group('dev')]
run app='':
    #!/usr/bin/env nu
    let target_app = if ("{{ app }}" | is-empty) {
        ls apps | where type == dir | get name | path basename | str join "\n" | ^gum choose --header "Select app to run"
    } else {
        "{{ app }}"
    }
    if ($target_app | is-not-empty) {
        cd $"apps/($target_app)"
        deno run -A npm:vite-plus/vp dev --host
    }
```

#### B. Interactive Fuzzy Test Runner (`gum filter`)
- **Enhancement**: Add a `test-pick` recipe in `scripts/test.just` allowing instant search and execution of specific test files.
```nu
[doc('Interactively select and run a specific test file')]
[group('test')]
test-pick:
    #!/usr/bin/env nu
    let test_files = (glob "sdk/**/*.test.ts" "apps/**/*.test.ts" | str join "\n")
    if ($test_files | is-empty) {
        ^gum log --level warn "No test files found."
        exit 0
    }
    let selected = ($test_files | ^gum filter --placeholder "Fuzzy search test files...")
    if ($selected | is-not-empty) {
        ^gum log --level info $"Running test: ($selected)"
        deno test --allow-all $selected
    }
```

---

### 3. Background Process Spinners (`gum spin`)

#### A. Vite & Paraglide Build Spinners
- **Problem**: Long-running commands like `deno install`, `svelte-kit sync`, and `vite build` flood the terminal or produce long silent pauses.
- **Enhancement**: Wrap build and compile steps in `gum spin`.
```nu
[doc('Build the application: deno.json -> build/')]
[group('deploy')]
build app='vision':
    #!/usr/bin/env nu
    rm -rf build
    ^gum spin --spinner dot --title $"Building apps/({{ app }})..." -- nu -c 'cd apps/{{ app }}; deno run -A npm:vite-plus/vp build'
    ^gum style --foreground 212 --bold "✓ Build complete: apps/{{ app }}"
```

#### B. Workspace Dependency & Preparation Spinner
- **Enhancement**: Smooth visual feedback for `prepare` in `scripts/dev.just`:
```nu
[doc('Purge caches & lockfiles, reinstall deps, resync generated code')]
[group('dev')]
prepare: (prune "true")
    #!/usr/bin/env nu
    ^gum spin --spinner globe --title "Installing dependencies & syncing SvelteKit..." -- nu -c '
        deno install
        cd apps/vision
        deno run -A npm:@sveltejs/kit@next/svelte-kit sync
    '
    ^gum style --foreground 48 --border rounded --padding "0 2" "Workspace prepared!"
```

---

### 4. Structured Logging & Status Cards (`gum log`, `gum style`, `gum join`)

#### A. Quality Gates Status Banner & Logs in `scripts/check.just`
- **Enhancement**: Replace raw unstyled text with standardized leveled logging (`gum log`) and a summary card on completion.
```nu
[doc('Run all check quality gates')]
[group('check')]
check:
    #!/usr/bin/env nu
    ^gum style --foreground 212 --border rounded --padding "0 2" "Running Quality Gates"
    just fmt
    just lint
    just types
    ^gum style --foreground 48 --border double --padding "0 2" "✓ All Quality Gates Passed"
```

#### B. Side-by-side Release / CI Summary Cards (`gum join`)
- **Enhancement**: Render multi-column stats for build outputs (e.g. app name, target version, status) using `gum join --horizontal`.

---

### 5. Interactive Paging & Log Inspection (`gum pager`)

#### A. Paged Audit & Coverage Viewers
- **Problem**: Large audit outputs from tools like `fallow` or verbose `deno test --coverage` scroll past terminal history.
- **Enhancement**: Pipe outputs into `gum pager` for searchable, scrollable inspection (`q` to exit).
```nu
[doc('Audit all code namespaces with interactive pager')]
[group('check')]
audit-view:
    deno run -A npm:fallow | gum pager

[doc('Inspect test coverage in interactive pager')]
[group('test')]
coverage-view:
    deno test --coverage | gum pager
```

---

### 6. Interactive Semver & Release Wizard (`gum choose`, `gum write`)

#### A. Interactive Release Workflow in `scripts/deploy.just`
- **Enhancement**: Provide an interactive wizard to select semver increment (`patch`, `minor`, `major`), compose release notes, and trigger CI gates:
```nu
[doc('Interactive release wizard')]
[group('deploy')]
release:
    #!/usr/bin/env nu
    let bump = (^gum choose --header "Select SemVer bump" "patch" "minor" "major")
    let notes = (^gum write --placeholder "Release notes / summary of changes..." --width 60 --height 6)
    if not (^gum confirm $"Publish ($bump) release?" | complete | $in.exit_code == 0) {
        ^gum log --level warn "Release aborted."
        exit 0
    }
    ^gum spin --title "Running CI gates..." -- just ci
    ^gum style --foreground 212 --border rounded --padding "1 2" $"🚀 Release ($bump) ready!\n($notes)"
```

---

## 🗂️ Proposed File-by-File Roadmap

| Target File | Proposed Gum Enhancements |
| :--- | :--- |
| **`scripts/_shared.just`** | Wire `_banner` into recipes; enhance `menu` with grouped categories and formatted headers. |
| **`scripts/dev.just`** | Add `gum confirm` to `prune`; add `gum choose` dynamic app picker to `run`; add `gum spin` to `prepare`. |
| **`scripts/check.just`** | Add `gum style` header and summary cards to `check`; add `audit-view` with `gum pager`. |
| **`scripts/test.just`** | Add `test-pick` fuzzy runner with `gum filter`; add `coverage-view` with `gum pager`. |
| **`scripts/deploy.just`** | Add `gum spin` to `build`; add `gum confirm` to `publish`; add interactive `release` wizard. |
