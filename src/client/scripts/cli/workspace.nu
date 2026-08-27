# workspace.nu — dynamic package introspection and workspace lifecycle maintenance
use ui.nu [chevron banner]

# --- Dynamic Workspace Discovery & Introspection ---

export def sdk-packages []: nothing -> list<string> {
    glob "sdk/*" | where { ($in | path type) == "dir" } | each {|p| $p | str replace --all '\' '/' | path basename }
}

export def app-packages []: nothing -> list<string> {
    glob "apps/*" | where { ($in | path type) == "dir" } | each {|p| $p | str replace --all '\' '/' | path basename }
}

export def inspect-package [pkg_dir: string]: nothing -> record {
    let clean = ($pkg_dir | str replace --all '\' '/')
    let name = ($clean | path basename)
    let is_app = ($clean | str starts-with "apps/")

    # Declarative capability detection (no hardcoded names)
    let has_vite = (glob $"($clean)/vite.config.*" | is-not-empty)
    let has_svelte_files = ((glob $"($clean)/src/**/*.svelte") ++ (glob $"($clean)/src/**/*.svelte.ts") | is-not-empty)
    let is_svelte = ($is_app or $has_vite or $has_svelte_files)

    let test_files = ((glob $"($clean)/**/*.test.ts") ++ (glob $"($clean)/**/*.spec.ts"))
    let has_tests = (not ($test_files | is-empty))

    {
        name: $name
        path: $clean
        is_app: $is_app
        is_svelte: $is_svelte
        has_tests: $has_tests
        engine: (if $is_svelte { "vitest" } else { "deno" })
        type_engine: (if $is_svelte { "svelte-check" } else { "deno" })
    }
}

export def workspace-categories []: nothing -> list<record> {
    [
        {
            name: "SDK"
            targets: (glob "sdk/*" | where { ($in | path type) == "dir" } | each {|d| inspect-package $d })
        }
        {
            name: "APP"
            targets: (glob "apps/*" | where { ($in | path type) == "dir" } | each {|d| inspect-package $d })
        }
    ]
}

export def app-targets [app: string = ""]: nothing -> list<record> {
    if ($app | is-empty) {
        glob "apps/*" | where { ($in | path type) == "dir" } | each {|d| inspect-package $d }
    } else {
        let clean = ($app | str replace --all '\' '/')
        let path = if ($clean | str starts-with "apps/") { $clean } else { $"apps/($clean)" }
        if not ($path | path exists) {
            ^gum log --level error $"Application not found: ($path)"
            exit 1
        }
        [(inspect-package $path)]
    }
}

# --- Workspace Lifecycle & Compatibility ---

export def ensure-node-compat []: nothing -> nothing {
    let nm = ($env.PWD | path join "node_modules")
    if ($nm | path exists) and not ($nm | path join "vite" | path exists) {
        let vite_dirs = (glob "node_modules/.deno/vite@*/node_modules/vite")
        if not ($vite_dirs | is-empty) {
            let vite_dir = ($vite_dirs | first)
            let rel = ($vite_dir | path relative-to $nm)
            do {
                cd $nm
                ^ln -sf $rel vite
            }
        }
    }
}

export def run-prune-workspace []: nothing -> nothing {
    let ch = (chevron)
    print $"(ansi purple_bold)🧹 Pruning caches & temporary artifacts...(ansi reset)"

    let root = ($env.PWD | path expand)
    let artifacts = ["node_modules", ".svelte-kit", ".vite", "deno.lock", "dist", "build"]
    let expand = {|pattern|
        glob $pattern | each {|dir|
            let clean = ($dir | str replace --all '\' '/')
            $artifacts | each {|item| $"($clean)/($item)" }
        } | flatten
    }

    let targets = (
        $artifacts
        ++ (do $expand "apps/*")
        ++ (do $expand "sdk/*")
    )

    mut removed_count = 0
    for $p in $targets {
        if ($p | path exists) {
            rm -r -f $p
            let rel = ($p | path expand | path relative-to $root | str replace --all '\' '/')
            print $"  ($ch) (ansi grey)Removed ($rel)(ansi reset)"
            $removed_count = ($removed_count + 1)
        }
    }

    if $removed_count == 0 {
        print $"  (ansi grey)No artifacts or caches found to prune(ansi reset)"
    }
    print $"(ansi green_bold)✓ Workspace clean(ansi reset)"
}

export def run-prepare-workspace []: nothing -> nothing {
    banner "📦 PREPARING WORKSPACE" "212"

    print $"(ansi cyan_bold)»(ansi reset) Installing dependencies..."
    ^deno install
    ensure-node-compat

    for $app in (app-packages) {
        print $"(ansi cyan_bold)»(ansi reset) Syncing SvelteKit for ($app)..."
        do {
            cd $"apps/($app)"
            ^deno run -A npm:@sveltejs/kit@next/svelte-kit sync
        } | complete | ignore
    }

    banner "✓ Workspace dependencies & types prepared" "48"
}
