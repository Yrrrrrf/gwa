# harness.nu — minimal quality gate & test dashboard harness

# --- Visual Badges & Formatters ---
export def chevron []: nothing -> string { $"(ansi cyan_bold)❯❯(ansi reset)" }

def metric [n: int, label: string, color: string = "green"]: nothing -> string {
    if $n > 0 { $"(ansi $color)($n) ($label)(ansi reset)" } else { $"(ansi grey)0 ($label)(ansi reset)" }
}

export def badge [a: int, la: string, b: int, lb: string, c: int, lc: string]: nothing -> string {
    let sa = if $la == "files" { $"(ansi grey)($a) files(ansi reset)" } else { (metric $a $la "green") }
    let sb = (metric $b $lb "red_bold")
    let sc = (metric $c $lc "yellow")
    $"\(($sa), ($sb), ($sc)\)"
}

export def print-stream [res: record, is_verbose: bool, is_err: bool]: nothing -> nothing {
    if ($is_verbose or $is_err) {
        if ($res.stdout | str trim | is-not-empty) {
            print ($res.stdout | lines | each {|l| $"    (ansi grey)│(ansi reset) ($l)" } | str join "\n")
        }
        if ($res.stderr | str trim | is-not-empty) {
            let bar = if $is_err { "red" } else { "grey" }
            print ($res.stderr | lines | each {|l| $"    (ansi $bar)│(ansi reset) ($l)" } | str join "\n")
        }
    }
}

# --- Parsers ---
def parse-count [text: string, pattern: string]: nothing -> int {
    $text | ansi strip | parse -r $pattern | get 0?.cnt? | default "0" | into int
}

def parse-test-stats [output: string]: nothing -> record<p: int, f: int, s: int> {
    let clean = ($output | ansi strip)
    let line = ($clean | lines | where { $in =~ "^\\s*Tests\\s+" or $in =~ "ok \\|" or $in =~ "FAILED \\|" } | get 0? | default $clean)
    let p = ($line | parse -r ".*?(?P<cnt>\\d+)\\s+passed.*" | get 0?.cnt? | default "0" | into int)
    let f = ($line | parse -r ".*?(?P<cnt>\\d+)\\s+failed.*" | get 0?.cnt? | default "0" | into int)
    let s = ($line | parse -r ".*?(?P<cnt>\\d+)\\s+skipped.*" | get 0?.cnt? | default "0" | into int)
    { p: $p, f: $f, s: $s }
}

# --- Dashboard Runners ---
export def run-tests-dashboard [is_verbose: bool = false]: nothing -> nothing {
    print ""
    ^gum style --foreground 212 --bold "🧪 TESTS DASHBOARD"

    let run_section = {|cat, dirs, engine_fn, run_fn|
        print $"(ansi purple_bold)[($cat)](ansi reset)"
        mut fail_count = 0

        for $dir in $dirs {
            let name = ($dir | path basename)
            let files = ((glob $"($dir)/**/*.test.ts") ++ (glob $"($dir)/**/*.spec.ts"))
            let engine = (do $engine_fn $dir $name)

            if ($files | is-empty) {
                print $"  (chevron) (ansi grey)($engine | fill -w 14)(ansi reset)(ansi default_bold)($name | fill -w 8)(ansi reset)(badge 0 passed 0 failed 0 skipped) (ansi grey)[no tests](ansi reset)"
            } else {
                let res = (do $run_fn $dir $name $engine)
                let stats = (parse-test-stats ($res.stdout + "\n" + $res.stderr))
                $fail_count = ($fail_count + $stats.f)
                print $"  (chevron) (ansi grey)($engine | fill -w 14)(ansi reset)(ansi default_bold)($name | fill -w 8)(ansi reset)(badge $stats.p passed $stats.f failed $stats.s skipped)"
                print-stream $res $is_verbose ($res.exit_code != 0 or $stats.f > 0)
            }
        }
        $fail_count
    }

    let sdk_fails = (do $run_section "SDK" (glob "sdk/*") {|d, n| if $n in ["state" "ui"] { "vitest" } else { "deno" } } {|d, n, eng|
        if $eng == "vitest" {
            do { deno run -A npm:vitest run --config ./config/vitest.config.ts --project $n } | complete
        } else {
            do { deno test --allow-all $d } | complete
        }
    })

    print ""
    let app_fails = (do $run_section "APP" (glob "apps/*") {|d, n| "vitest" } {|d, n, eng|
        do { deno run -A npm:vitest run --config ./config/vitest.config.ts --project $n } | complete
    })

    let total_failed = ($sdk_fails + $app_fails)
    print ""
    if $total_failed > 0 {
        ^gum style --foreground 196 --bold $"✗ ($total_failed) test suites failed"; exit 1
    } else {
        ^gum style --foreground 48 --bold "✓ All test suites passed cleanly"
    }
}

export def run-types-dashboard [is_verbose: bool = false]: nothing -> nothing {
    print ""
    ^gum style --foreground 212 --bold "🛡️ QUALITY & TYPE GATES"

    let check_section = {|cat, dirs, is_app|
        print $"(ansi purple_bold)[($cat)](ansi reset)"
        mut err_count = 0

        for $dir in $dirs {
            let name = ($dir | path basename)
            let svelte_files = ((glob $"($dir)/src/**/*.svelte") ++ (glob $"($dir)/src/**/*.svelte.ts"))
            let is_svelte = ($is_app or $name in ["state" "ui"] or not ($svelte_files | is-empty))
            let engine = if $is_svelte { "svelte-check" } else { "deno" }

            cd $dir
            if $is_app { do { deno run -A npm:@sveltejs/kit@next/svelte-kit sync } | complete }

            let res = if $is_svelte {
                let cfg_flags = if ($is_app and ("tsconfig.json" | path exists)) { ["--tsconfig" "./tsconfig.json" "--config" "./vite.config.ts"] } else { [] }
                do { deno run -A npm:svelte-check@^4.7.5 ...$cfg_flags } | complete
            } else {
                do { deno check src/mod.ts } | complete
            }
            cd ../..

            let text = ($res.stdout + "\n" + $res.stderr)
            let files_count = (glob $"($dir)/src/**/*" | where { ($in | path type) == "file" } | length)
            let err = (parse-count $text ".*?(?:found|Found)\\s+(?P<cnt>\\d+)\\s+error")
            let warn = (parse-count $text ".*?(?:and|Found)\\s+(?P<cnt>\\d+)\\s+warning")
            $err_count = ($err_count + $err)

            print $"  (chevron) (ansi grey)($engine | fill -w 14)(ansi reset)(ansi default_bold)($name | fill -w 8)(ansi reset)(badge $files_count files $err errors $warn warnings)"
            print-stream $res $is_verbose ($res.exit_code != 0 or $err > 0)
        }
        $err_count
    }

    let sdk_errs = (do $check_section "SDK" (glob "sdk/*") false)
    print ""
    let app_errs = (do $check_section "APP" (glob "apps/*") true)

    let total_errors = ($sdk_errs + $app_errs)
    print ""
    if $total_errors > 0 {
        ^gum style --foreground 196 --bold $"✗ ($total_errors) type checking errors found"; exit 1
    } else {
        ^gum style --foreground 48 --bold "✓ 0 type errors across all workspaces"
    }
}
