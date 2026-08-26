# deploy.just — ship · build, preview, publish, and release

[doc('Run quality gate (check + test) (pass -v for detailed logs)')]
[group('ci')]
[positional-arguments]
ci *args: (check args) (test args)

[doc('Build applications: deno.json -> build/ (builds all apps or specified app) (pass -v for detailed logs)')]
[group('deploy')]
[positional-arguments]
[script]
build app='' *args:
    use {{ HARNESS_NU }} *

    def --wrapped main [app = '', ...raw_args: string] {
        let all_args = ([$app] ++ $raw_args | where { $in | is-not-empty })
        let is_verbose = ($all_args | any { $in in ["-v", "--verbose"] })
        let target_app = ($all_args | where { not ($in in ["-v", "--verbose"]) } | get 0? | default "")
        run-build-dashboard $target_app $is_verbose
    }

[doc('Preview production build (prompts app picker if not specified)')]
[group('deploy')]
[positional-arguments]
[script]
preview app='': (build app)
    use {{ HARNESS_NU }} *

    let target_app = if ("{{ app }}" | is-empty) {
        let apps = (app-packages)
        if ($apps | length) == 1 {
            $apps | first
        } else {
            $apps | str join "\n" | ^gum choose --header "Select app to preview"
        }
    } else {
        "{{ app }}"
    }

    if ($target_app | is-not-empty) {
        ^gum style --foreground 212 --bold $"🎪 Previewing production build: apps/($target_app)"
        cd $"apps/($target_app)"
        ^deno run -A npm:vite preview
    }

[doc('Publish build release')]
[group('deploy')]
publish: ci build
    @print "✓ publish done"
