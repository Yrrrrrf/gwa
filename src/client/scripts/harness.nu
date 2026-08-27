# harness.nu — minimal quality gate & test dashboard harness
# --- Visual Badges & Formatters ---
export def chevron []: nothing -> string { $"(ansi cyan_bold)❯❯(ansi reset)" }
def metric [n: int, label: string, color: string = green]: nothing -> string {
    if $n > 0 { $"(ansi $color)($n) ($label)(ansi reset)" } else { $"(ansi grey)0 ($label)(ansi reset)" }
}
export def badge [
    a: int
    la: string
    b: int
    lb: string
    c: int
    lc: string
]: nothing -> string {
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
    let line = (
        $clean | lines | where { $in =~ "^\\s*Tests\\s+" or $in =~ "ok \\|" or $in =~ "FAILED \\|" } | get 0? | default $clean
    )
    let p = (
        $line | parse -r ".*?(?P<cnt>\\d+)\\s+passed.*" | get 0?.cnt? | default "0" | into int
    )
    let f = (
        $line | parse -r ".*?(?P<cnt>\\d+)\\s+failed.*" | get 0?.cnt? | default "0" | into int
    )
    let s = (
        $line | parse -r ".*?(?P<cnt>\\d+)\\s+skipped.*" | get 0?.cnt? | default "0" | into int
    )
    {
        p: $p
        f: $f
        s: $s
    }
}
# --- Process Execution & Spinner Helper ---
def exec-cmd [title: string, cmd_args: list<string>, is_verbose: bool = false]: nothing -> record {
    let start = (date now)
    let res = if $is_verbose {
        let exe = ($cmd_args | first)
        let args = ($cmd_args | skip 1)
        do { ^$exe ...$args } | complete
    } else {
        do { ^gum spin --spinner dot --spinner.foreground "212" --title $title -- ...$cmd_args } | complete
    }
    let elapsed = ((date now) - $start)
    {
        stdout: ($res.stdout? | default "")
        stderr: ($res.stderr? | default "")
        exit_code: ($res.exit_code? | default 0)
        elapsed: $elapsed
    }
}

# --- Workspace discovery helpers ---
export def sdk-packages []: nothing -> list<string> {
    glob "sdk/*" | where { ($in | path type) == "dir" } | each {|p| $p | str replace --all '\' '/' | path basename }
}
export def app-packages []: nothing -> list<string> {
    glob "apps/*" | where { ($in | path type) == "dir" } | each {|p| $p | str replace --all '\' '/' | path basename }
}

# --- Workspace Maintenance Runners ---
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

def ensure-node-compat []: nothing -> nothing {
    let nm = ($env.PWD | path join "node_modules")
    if ($nm | path exists) and not ($nm | path join "vite" | path exists) {
        let vite_dirs = (glob "node_modules/.deno/vite@*/node_modules/vite")
        if not ($vite_dirs | is-empty) {
            let vite_dir = ($vite_dirs | first)
            let rel = ($vite_dir | path relative-to $nm)
            cd $nm
            ^ln -sf $rel vite
            cd ../..
        }
    }
}

export def run-prepare-workspace []: nothing -> nothing {
    print ""
    ^gum style --foreground 212 --bold "📦 PREPARING WORKSPACE"

    print $"(ansi cyan_bold)»(ansi reset) Installing dependencies..."
    ^deno install
    ensure-node-compat

    for $app in (app-packages) {
        print $"(ansi cyan_bold)»(ansi reset) Syncing SvelteKit for ($app)..."
        cd $"apps/($app)"
        do { ^deno run -A npm:@sveltejs/kit@next/svelte-kit sync } | complete
        cd ../..
    }

    print ""
    ^gum style --foreground 48 --bold "✓ Workspace dependencies & types prepared"
}

# --- Dashboard Runners ---
export def run-build-dashboard [app: string = "", is_verbose: bool = false]: nothing -> nothing {
    let target_apps = if ($app | is-empty) {
        (app-packages)
    } else {
        [$app]
    }

    if ($target_apps | is-empty) {
        ^gum log --level warn "No applications found in apps/"
        exit 1
    }

    print ""
    ^gum style --foreground 212 --bold "📦 BUILDING APPLICATIONS"
    mut build_failed = 0

    for $target in $target_apps {
        let clean_app = ($target | str replace --all '\' '/')
        let app_path = $"apps/($clean_app)"
        if not ($app_path | path exists) {
            ^gum log --level error $"Application not found: ($app_path)"
            exit 1
        }

        cd $app_path
        rm -r -f build
        do { ^deno run -A npm:@sveltejs/kit@next/svelte-kit sync } | complete

        let res = (exec-cmd $"Building ($clean_app)..." ["deno", "run", "-A", "npm:vite", "build"] $is_verbose)
        cd ../..

        if ($res.exit_code == 0) {
            print $"  (chevron) (ansi grey)vite build     (ansi reset)(ansi default_bold)($clean_app | fill -w 8)(ansi reset) (ansi green)✓ success(ansi reset) (ansi grey)\(($res.elapsed)\)(ansi reset)"
            print-stream $res $is_verbose false
        } else {
            $build_failed = ($build_failed + 1)
            print $"  (chevron) (ansi grey)vite build     (ansi reset)(ansi default_bold)($clean_app | fill -w 8)(ansi reset) (ansi red_bold)✗ failed(ansi reset)"
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
}

export def run-tests-dashboard [is_verbose: bool = false]: nothing -> nothing {
    print ""
    ^gum style --foreground 212 --bold "🧪 TEST"

    let run_section = {|cat, dirs, get_engine_and_cmd|
        print $"(ansi purple_bold)[($cat)](ansi reset)"
        mut fail_count = 0

        for $dir in $dirs {
            let clean_dir = ($dir | str replace --all '\' '/')
            let name = ($clean_dir | path basename)
            let files = ((glob $"($clean_dir)/**/*.test.ts") ++ (glob $"($clean_dir)/**/*.spec.ts"))
            let item = (do $get_engine_and_cmd $clean_dir $name)
            let engine = $item.engine
            let cmd_args = $item.cmd

            if ($files | is-empty) {
                print $"  (chevron) (ansi grey)($engine | fill -w 14)(ansi reset)(ansi default_bold)($name | fill -w 8)(ansi reset)(badge 0 passed 0 failed 0 skipped) (ansi grey)[no tests](ansi reset)"
            } else {
                let res = (exec-cmd $"Running tests for ($name)..." $cmd_args $is_verbose)
                let stats = (parse-test-stats ($res.stdout + "\n" + $res.stderr))
                $fail_count = ($fail_count + $stats.f)
                print $"  (chevron) (ansi grey)($engine | fill -w 14)(ansi reset)(ansi default_bold)($name | fill -w 8)(ansi reset)(badge $stats.p passed $stats.f failed $stats.s skipped)"
                print-stream $res $is_verbose ($res.exit_code != 0 or $stats.f > 0)
            }
        }
        $fail_count
    }

    let sdk_fails = (do $run_section "SDK" (glob "sdk/*" | where { ($in | path type) == "dir" }) {|d, n|
        if $n in ["state", "ui"] {
            { engine: "vitest", cmd: ["deno", "run", "-A", "npm:vitest", "run", "--config", "./config/vitest.config.ts", "--project", $n] }
        } else {
            { engine: "deno", cmd: ["deno", "test", "--allow-all", $d] }
        }
    })

    print ""
    let app_fails = (do $run_section "APP" (glob "apps/*" | where { ($in | path type) == "dir" }) {|d, n|
        { engine: "vitest", cmd: ["deno", "run", "-A", "npm:vitest", "run", "--config", "./config/vitest.config.ts", "--project", $n] }
    })

    let total_failed = ($sdk_fails + $app_fails)
    print ""
    if $total_failed > 0 {
        ^gum style --foreground 196 --bold $"✗ ($total_failed) test suites failed"
        exit 1
    } else {
        ^gum style --foreground 48 --bold "✓ All test suites passed cleanly"
    }
}

export def run-types-dashboard [is_verbose: bool = false]: nothing -> nothing {
    ensure-node-compat
    print ""
    ^gum style --foreground 212 --bold "🛡️ TYPES"

    let check_section = {|cat, dirs, is_app|
        print $"(ansi purple_bold)[($cat)](ansi reset)"
        mut err_count = 0

        for $dir in $dirs {
            let clean_dir = ($dir | str replace --all '\' '/')
            let name = ($clean_dir | path basename)
            let svelte_files = ((glob $"($clean_dir)/src/**/*.svelte") ++ (glob $"($clean_dir)/src/**/*.svelte.ts"))
            let is_svelte = ($is_app or $name in ["state", "ui"] or not ($svelte_files | is-empty))
            let engine = if $is_svelte { "svelte-check" } else { "deno" }

            cd $clean_dir
            if $is_app {
                do { ^deno run -A npm:@sveltejs/kit@next/svelte-kit sync } | complete
            }

            let cmd_args = if $is_svelte {
                let vcfg = if ("vite.config.mts" | path exists) { "./vite.config.mts" } else if ("vite.config.ts" | path exists) { "./vite.config.ts" } else { "" }
                let tsc = if ("tsconfig.json" | path exists) { "./tsconfig.json" } else { "../../config/tsconfig.json" }
                let cfg_flags = if ($vcfg | is-not-empty) {
                    ["--tsconfig", $tsc, "--config", $vcfg]
                } else {
                    ["--tsconfig", $tsc]
                }
                ["deno", "run", "-A", "npm:svelte-check@^4.7.5", ...$cfg_flags]
            } else {
                ["deno", "check", "src/mod.ts"]
            }

            let res = (exec-cmd $"Checking types for ($name)..." $cmd_args $is_verbose)
            cd ../..

            let text = ($res.stdout + "\n" + $res.stderr)
            let files_count = (glob $"($clean_dir)/src/**/*" | where { ($in | path type) == "file" } | length)
            let err = (parse-count $text ".*?(?:found|Found)\\s+(?P<cnt>\\d+)\\s+error")
            let warn = (parse-count $text ".*?(?:and|Found)\\s+(?P<cnt>\\d+)\\s+warning")
            $err_count = ($err_count + $err)

            print $"  (chevron) (ansi grey)($engine | fill -w 14)(ansi reset)(ansi default_bold)($name | fill -w 8)(ansi reset)(badge $files_count files $err errors $warn warnings)"
            print-stream $res $is_verbose ($res.exit_code != 0 or $err > 0)
        }
        $err_count
    }

    let sdk_errs = (do $check_section "SDK" (glob "sdk/*" | where { ($in | path type) == "dir" }) false)
    print ""
    let app_errs = (do $check_section "APP" (glob "apps/*" | where { ($in | path type) == "dir" }) true)

    let total_errors = ($sdk_errs + $app_errs)
    print ""
    if $total_errors > 0 {
        ^gum style --foreground 196 --bold $"✗ ($total_errors) type checking errors found"
        exit 1
    } else {
        ^gum style --foreground 48 --bold "✓ 0 type errors across all workspaces"
    }
}
