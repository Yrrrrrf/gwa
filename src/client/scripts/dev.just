# dev.just — run, live preview, and prepare workspace

[doc('Run an app on the dev server (prompts app picker if not specified)')]
[group('dev')]
[positional-arguments]
[script]
run *args:
    use {{ HARNESS_NU }} *

    def --wrapped main [...raw: string]: nothing -> nothing {
        let f = (parse-cli-flags $raw)
        let apps = (app-packages)

        let target_app = if ($f.target | is-not-empty) {
            $f.target | str replace "apps/" ""
        } else if ($apps | length) == 1 {
            $apps | first
        } else if ($apps | is-empty) {
            ^gum log --level warn "No applications found in apps/"
            return
        } else {
            $apps | str join "\n" | ^gum choose --header "Select app to run"
        }

        if ($target_app | is-not-empty) {
            banner $"🚀 Starting dev server: apps/($target_app)" "212"
            cd $"apps/($target_app)"
            let extra = ($f.rest | default [])
            ^deno run -A npm:vite dev --host ...$extra
        }
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
