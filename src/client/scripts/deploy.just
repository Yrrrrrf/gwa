# deploy.just — ship · build, preview, publish, and release

[doc('Run quality gate (check + test) (pass -v for detailed logs)')]
[group('ci')]
[positional-arguments]
ci *args: (check args) (test args)

[doc('Build applications: deno.json -> build/ (builds all apps or specified app) (pass -v for detailed logs)')]
[group('deploy')]
[positional-arguments]
[script]
build *args:
    use {{ HARNESS_NU }} [parse-cli-flags run-build-dashboard]

    def --wrapped main [...raw: string]: nothing -> nothing {
        let f = (parse-cli-flags $raw)
        run-build-dashboard $f.target $f.v
    }

[doc('Preview production build (prompts app picker if not specified) (pass -v for detailed build logs)')]
[group('deploy')]
[positional-arguments]
[script]
preview *args:
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
            $apps | str join "\n" | ^gum choose --header "Select app to preview"
        }

        if ($target_app | is-not-empty) {
            run-build-dashboard $target_app $f.v
            banner $"🎪 Previewing production build: apps/($target_app)" "212"
            cd $"apps/($target_app)"
            ^deno run -A npm:vite preview
        }
    }

[doc('Publish build release')]
[group('deploy')]
publish: ci build
    @print "✓ publish done"
