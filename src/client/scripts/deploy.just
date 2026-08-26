# deploy.just — ship · build, preview, publish, and release

[doc('Run quality gate (check + test)')]
[group('ci')]
ci: check test

[doc('Build applications: deno.json -> build/ (builds all apps or specified app)')]
[group('deploy')]
[positional-arguments]
[script]
build app='':
    use {{ HARNESS_NU }} *

    let target_apps = if ("{{ app }}" | is-empty) {
        (app-packages)
    } else {
        ["{{ app }}"]
    }

    if ($target_apps | is-empty) {
        ^gum log --level warn "No applications found in apps/"
        exit 1
    }

    print ""
    ^gum style --foreground 212 --bold "📦 BUILDING APPLICATIONS"
    mut build_failed = 0

    for $app in $target_apps {
        let app_path = $"apps/($app)"
        if not ($app_path | path exists) {
            ^gum log --level error $"Application not found: ($app_path)"
            exit 1
        }

        cd $app_path
        rm -r -f build
        do { ^deno run -A npm:@sveltejs/kit@next/svelte-kit sync } | complete

        let start = (date now)
        let res = (do { ^deno run -A npm:vite build } | complete)
        let elapsed = ((date now) - $start)
        cd ../..

        if ($res.exit_code == 0) {
            print $"  (chevron) (ansi grey)vite build     (ansi reset)(ansi default_bold)($app | fill -w 8)(ansi reset) (ansi green)✓ success(ansi reset) (ansi grey)\(($elapsed)\)(ansi reset)"
        } else {
            $build_failed = ($build_failed + 1)
            print $"  (chevron) (ansi grey)vite build     (ansi reset)(ansi default_bold)($app | fill -w 8)(ansi reset) (ansi red_bold)✗ failed(ansi reset)"
            print-stream $res true true
        }
    }

    print ""
    if $build_failed > 0 {
        ^gum style --foreground 196 --bold $"✗ ($build_failed) build failed"
        exit 1
    } else {
        ^gum style --foreground 48 --bold "✓ All applications built successfully"
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
