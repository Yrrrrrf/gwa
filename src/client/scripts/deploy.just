# deploy.just — ship · build, preview, publish, and release

[doc('Run quality gate (check + test) (pass -v for detailed logs, -b for timing)')]
[group('ci')]
[positional-arguments]
ci *args: (check args) (test args)

[doc('Build applications: deno.json -> build/ (builds all apps or specified app) (pass -v for detailed logs, -b for timing)')]
[group('deploy')]
[positional-arguments]
[script]
build *args:
    use {{ HARNESS_NU }} [parse-cli-flags run-build-dashboard]

    def --wrapped main [...raw: string] {
        let f = (parse-cli-flags $raw)
        run-build-dashboard $f.target $f.v $f.b
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
