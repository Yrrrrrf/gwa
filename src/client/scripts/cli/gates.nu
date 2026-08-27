# gates.nu — declarative quality gates for types, tests, and builds
use ui.nu [badge]
use workspace.nu [workspace-categories app-targets ensure-node-compat]
use runner.nu [run-suite parse-count parse-test-stats]

export def run-types-dashboard [is_verbose: bool = false]: nothing -> nothing {
    ensure-node-compat

    let resolver = {|pkg|
        if $pkg.is_svelte {
            let vcfg = if ($"($pkg.path)/vite.config.mts" | path exists) {
                "./vite.config.mts"
            } else if ($"($pkg.path)/vite.config.ts" | path exists) {
                "./vite.config.ts"
            } else {
                ""
            }
            let tsc = if ($"($pkg.path)/tsconfig.json" | path exists) {
                "./tsconfig.json"
            } else {
                "../../config/tsconfig.json"
            }
            let cfg_flags = if ($vcfg | is-not-empty) {
                ["--tsconfig", $tsc, "--config", $vcfg]
            } else {
                ["--tsconfig", $tsc]
            }

            let pre = if $pkg.is_app {
                {
                    do {
                        cd $pkg.path
                        ^deno run -A npm:@sveltejs/kit@next/svelte-kit sync
                    } | complete | ignore
                }
            } else { null }

            {
                engine: "svelte-check"
                cwd: $pkg.path
                cmd: ["deno", "run", "-A", "npm:svelte-check@^4.7.5", ...$cfg_flags]
                pre: $pre
            }
        } else {
            {
                engine: "deno"
                cwd: $pkg.path
                cmd: ["deno", "check", "src/mod.ts"]
            }
        }
    }

    let evaluator = {|res, pkg|
        let text = ($res.stdout + "\n" + $res.stderr)
        let files_count = (glob $"($pkg.path)/src/**/*" | where { ($in | path type) == "file" } | length)
        let err = (parse-count $text ".*?(?:found|Found)\\s+(?P<cnt>\\d+)\\s+error")
        let warn = (parse-count $text ".*?(?:and|Found)\\s+(?P<cnt>\\d+)\\s+warning")
        {
            badge: (badge $files_count "files" $err "errors" $warn "warnings")
            is_err: ($res.exit_code != 0 or $err > 0)
            err_count: $err
        }
    }

    run-suite "🛡️ TYPES" (workspace-categories) $is_verbose --cmd-preview "deno run -A npm:svelte-check --tsconfig <tsconfig.json> --config <vite.config>" --resolver $resolver --evaluator $evaluator --success-msg "✓ 0 type errors across all workspaces" --fail-msg {|n| $"✗ ($n) type checking errors found" }
}

export def run-tests-dashboard [is_verbose: bool = false]: nothing -> nothing {
    let resolver = {|pkg|
        let engine = if $pkg.is_svelte { "vitest" } else { "deno" }
        if not $pkg.has_tests {
            {
                engine: $engine
                skip: "no tests"
                badge: (badge 0 "passed" 0 "failed" 0 "skipped")
            }
        } else if $pkg.is_svelte {
            {
                engine: "vitest"
                cwd: ""
                cmd: ["deno", "run", "-A", "npm:vitest", "run", "--config", "./config/vitest.config.ts", "--project", $pkg.name]
            }
        } else {
            {
                engine: "deno"
                cwd: ""
                cmd: ["deno", "test", "--allow-all", $pkg.path]
            }
        }
    }

    let evaluator = {|res, pkg|
        let stats = (parse-test-stats ($res.stdout + "\n" + $res.stderr))
        {
            badge: (badge $stats.p "passed" $stats.f "failed" $stats.s "skipped")
            is_err: ($res.exit_code != 0 or $stats.f > 0)
            err_count: $stats.f
        }
    }

    run-suite "🧪 TEST" (workspace-categories) $is_verbose --cmd-preview "deno run -A npm:vitest run --config ./config/vitest.config.ts --project <sdk/*>" --resolver $resolver --evaluator $evaluator --success-msg "✓ All test suites passed cleanly" --fail-msg {|n| $"✗ ($n) test suites failed" }
}

export def run-build-dashboard [app: string = "", is_verbose: bool = false]: nothing -> nothing {
    let targets = (app-targets $app)
    if ($targets | is-empty) {
        ^gum log --level warn "No applications found in apps/"
        exit 1
    }

    let resolver = {|pkg|
        {
            engine: "vite build"
            cwd: $pkg.path
            pre: {
                rm -r -f $"($pkg.path)/build"
                do {
                    cd $pkg.path
                    ^deno run -A npm:@sveltejs/kit@next/svelte-kit sync
                } | complete | ignore
            }
            cmd: ["deno", "run", "-A", "npm:vite", "build"]
        }
    }

    let evaluator = {|res, pkg|
        let is_ok = ($res.exit_code == 0)
        let status_badge = if $is_ok {
            $"(ansi green)✓ success(ansi reset) (ansi grey)\(($res.elapsed)\)(ansi reset)"
        } else {
            $"(ansi red_bold)✗ failed(ansi reset)"
        }
        {
            badge: $status_badge
            is_err: (not $is_ok)
            err_count: (if $is_ok { 0 } else { 1 })
        }
    }

    run-suite "📦 BUILDING APPLICATIONS" [{ targets: $targets }] $is_verbose --cmd-preview "deno run -A npm:vite build (in <apps/*>)" --resolver $resolver --evaluator $evaluator --success-msg "✓ All applications built successfully" --fail-msg {|n| $"✗ ($n) build failed" }
}
