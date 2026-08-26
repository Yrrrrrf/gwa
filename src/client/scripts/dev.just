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
    run-prepare-workspace

[doc('Prune all node_modules, .svelte-kit, .vite, deno.lock')]
[group('dev')]
[script]
prune:
    use {{ HARNESS_NU }} *
    run-prune-workspace
