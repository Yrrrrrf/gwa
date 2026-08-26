# dev.just — run, live preview, and prepare workspace

[doc('Run an app on the dev server (prompts app picker if not specified)')]
[group('dev')]
[positional-arguments]
[script]
run app='' *args:
    use {{ HARNESS_NU }} *

    let target_app = if ("{{ app }}" | is-empty) {
        let apps = (app-packages)
        if ($apps | length) == 1 {
            $apps | first
        } else if ($apps | is-empty) {
            ^gum log --level warn "No applications found in apps/"
            exit 1
        } else {
            $apps | str join "\n" | ^gum choose --header "Select app to run"
        }
    } else {
        "{{ app }}"
    }

    if ($target_app | is-not-empty) {
        ^gum style --foreground 212 --bold $"🚀 Starting dev server: apps/($target_app)"
        cd $"apps/($target_app)"
        ^deno run -A npm:vite dev --host {{ args }}
    }

[doc('Purge caches & lockfiles, reinstall deps, resync generated code')]
[group('dev')]
[script]
prepare: prune
    use {{ HARNESS_NU }} *

    print ""
    ^gum style --foreground 212 --bold "📦 PREPARING WORKSPACE"

    print $"(ansi cyan_bold)»(ansi reset) Installing dependencies..."
    ^deno install

    for $app in (glob "apps/*") {
        let clean_app = ($app | str replace --all '\' '/')
        let name = ($clean_app | path basename)
        print $"(ansi cyan_bold)»(ansi reset) Syncing SvelteKit for ($name)..."
        cd $clean_app
        ^deno run -A npm:@sveltejs/kit@next/svelte-kit sync
        cd ../..
    }

    print ""
    ^gum style --foreground 48 --bold "✓ Workspace dependencies & types prepared"

[doc('Prune all node_modules, .svelte-kit, .vite, deno.lock')]
[group('dev')]
[script]
prune:
    use {{ HARNESS_NU }} *

    let ch = (chevron)
    print $"(ansi purple_bold)🧹 Pruning caches & temporary artifacts...(ansi reset)"

    # Root caches
    for $p in ["node_modules" ".svelte-kit" ".vite" "deno.lock" "dist" "build"] {
        if ($p | path exists) {
            rm -r -f $p
            print $"  ($ch) (ansi grey)Removed ($p)(ansi reset)"
        }
    }

    # Apps caches
    for $app in (glob "apps/*") {
        let clean_app = ($app | str replace --all '\' '/')
        for $p in [$"($clean_app)/node_modules" $"($clean_app)/.svelte-kit" $"($clean_app)/.vite" $"($clean_app)/build"] {
            if ($p | path exists) {
                rm -r -f $p
                let rel = ($p | path relative-to $env.PWD | str replace --all '\' '/')
                print $"  ($ch) (ansi grey)Removed ($rel)(ansi reset)"
            }
        }
    }

    # SDK caches
    for $sdk in (glob "sdk/*") {
        let clean_sdk = ($sdk | str replace --all '\' '/')
        for $p in [$"($clean_sdk)/node_modules" $"($clean_sdk)/.vite" $"($clean_sdk)/dist"] {
            if ($p | path exists) {
                rm -r -f $p
                let rel = ($p | path relative-to $env.PWD | str replace --all '\' '/')
                print $"  ($ch) (ansi grey)Removed ($rel)(ansi reset)"
            }
        }
    }

    print $"(ansi green_bold)✓ Workspace clean(ansi reset)"
