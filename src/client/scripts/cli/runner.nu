# runner.nu — generic execution step, suite coordinator, and output parsers
use ui.nu [chevron badge banner print-stream]

# --- Output Parsers ---

export def parse-count [text: string, pattern: string]: nothing -> int {
    $text | ansi strip | parse -r $pattern | get 0?.cnt? | default "0" | into int
}

export def parse-test-stats [output: string]: nothing -> record<p: int, f: int, s: int> {
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

# --- Generic Process Execution Step ---

export def exec-step [
    title: string
    cmd_args: list<string>
    is_verbose: bool = false
    --cwd: string = ""
]: nothing -> record {
    let start = (date now)
    let exe = ($cmd_args | first)
    let args = ($cmd_args | skip 1)

    if $is_verbose {
        let cwd_label = if ($cwd | is-not-empty) { $" (ansi grey)in(ansi reset) (ansi cyan)($cwd)(ansi reset)" } else { "" }
        print $"    (ansi grey)┌─ [EXEC](ansi reset) (ansi white_bold)($cmd_args | str join ' ')($cwd_label)(ansi reset)"
    }

    let res = if $is_verbose {
        if ($cwd | is-not-empty) {
            do {
                cd $cwd
                ^$exe ...$args
            } | complete
        } else {
            do { ^$exe ...$args } | complete
        }
    } else {
        if ($cwd | is-not-empty) {
            do {
                cd $cwd
                ^gum spin --spinner dot --spinner.foreground "212" --title $title -- $exe ...$args
            } | complete
        } else {
            do { ^gum spin --spinner dot --spinner.foreground "212" --title $title -- $exe ...$args } | complete
        }
    }

    let elapsed = ((date now) - $start)
    {
        stdout: ($res.stdout? | default "")
        stderr: ($res.stderr? | default "")
        exit_code: ($res.exit_code? | default 0)
        elapsed: $elapsed
    }
}

# --- Generalized Suite Runner ---

export def run-suite [
    title: string
    categories: list<record>
    is_verbose: bool = false
    --resolver: closure
    --evaluator: closure
    --success-msg: string
    --fail-msg: closure
]: nothing -> nothing {
    banner $title "212"
    mut total_errors = 0

    for $cat in $categories {
        if ($cat.name? | default "" | is-not-empty) {
            print $"(ansi purple_bold)[($cat.name)](ansi reset)"
        }

        for $pkg in $cat.targets {
            let plan = (do $resolver $pkg)

            # 1. Check if skipped (e.g. no tests)
            if ($plan.skip? | default "" | is-not-empty) {
                let skip_badge = ($plan.badge? | default "")
                print $"  (chevron) (ansi grey)($plan.engine | fill -w 14)(ansi reset)(ansi default_bold)($pkg.name | fill -w 8)(ansi reset)($skip_badge) (ansi grey)[($plan.skip)](ansi reset)"
                continue
            }

            # 2. Optional pre-flight hook (e.g. svelte-kit sync)
            if ($plan.pre? != null) {
                do $plan.pre
            }

            # 3. Execute step in isolated cwd
            let cwd = ($plan.cwd? | default "")
            let res = (exec-step $"Running ($plan.engine) for ($pkg.name)..." $plan.cmd $is_verbose --cwd $cwd)

            # 4. Evaluate and parse outputs
            let eval = (do $evaluator $res $pkg)
            $total_errors = ($total_errors + $eval.err_count)

            # 5. Format and print status row
            print $"  (chevron) (ansi grey)($plan.engine | fill -w 14)(ansi reset)(ansi default_bold)($pkg.name | fill -w 8)(ansi reset)($eval.badge)"

            # 6. Stream logs if verbose or on error
            print-stream $res $is_verbose $eval.is_err
        }
        print ""
    }

    if $total_errors > 0 {
        banner (do $fail_msg $total_errors) "196"
        exit 1
    } else {
        banner $success_msg "48"
    }
}
