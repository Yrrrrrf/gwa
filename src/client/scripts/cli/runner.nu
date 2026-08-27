# runner.nu — generic execution step, suite coordinator, output parsers, and live viewport
use ui.nu [chevron badge banner render-cmd-preview clear-viewport print-stream SPINNER_FRAMES]

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

# --- Process Execution with Live Ephemeral Viewport ---

export def exec-step [
    title: string
    cmd_args: list<string>
    is_verbose: bool = false
    --cwd: string = ""
    --engine: string = ""
    --name: string = ""
]: nothing -> record {
    let start = (date now)
    let exe = ($cmd_args | first)
    let args = ($cmd_args | skip 1)

    # 1. Verbose Mode: Full command trace & un-buffered live output
    if $is_verbose {
        let cwd_label = if ($cwd | is-not-empty) { $" (ansi grey)in(ansi reset) (ansi cyan)($cwd)(ansi reset)" } else { "" }
        print $"    (ansi grey)┌─ [EXEC](ansi reset) (ansi white_bold)($cmd_args | str join ' ')($cwd_label)(ansi reset)"

        let res = if ($cwd | is-not-empty) {
            do {
                cd $cwd
                ^$exe ...$args
            } | complete
        } else {
            do { ^$exe ...$args } | complete
        }

        let elapsed = ((date now) - $start)
        return {
            stdout: ($res.stdout? | default "")
            stderr: ($res.stderr? | default "")
            exit_code: ($res.exit_code? | default 0)
            elapsed: $elapsed
        }
    }

    # 2. Non-interactive fallback (pipes / CI)
    if not (is-terminal --stdout) {
        let res = if ($cwd | is-not-empty) {
            do {
                cd $cwd
                ^gum spin --spinner dot --spinner.foreground "212" --title $title -- $exe ...$args
            } | complete
        } else {
            do { ^gum spin --spinner dot --spinner.foreground "212" --title $title -- $exe ...$args } | complete
        }
        let elapsed = ((date now) - $start)
        return {
            stdout: ($res.stdout? | default "")
            stderr: ($res.stderr? | default "")
            exit_code: ($res.exit_code? | default 0)
            elapsed: $elapsed
        }
    }

    # 3. Interactive TTY: Live Ephemeral Rolling Viewport (Docker / Podman style)
    let log_file = (mktemp -t "gwa-stream-XXXXXX.log")
    let res_file = (mktemp -t "gwa-res-XXXXXX.nuon")

    let jid = (job spawn {
        if ($cwd | is-not-empty) {
            cd $cwd
            ^$exe ...$args o+e> $log_file
        } else {
            ^$exe ...$args o+e> $log_file
        }
        let code = $env.LAST_EXIT_CODE
        { exit_code: $code } | to nuon | save -f $res_file
    })

    mut f_idx = 0
    mut lines_shown = 0
    let frames = $SPINNER_FRAMES
    let frames_len = ($frames | length)

    # Initial placeholder row
    print -n $"  (chevron) (ansi grey)($engine | fill -w 14)(ansi reset)(ansi default_bold)($name | fill -w 8)(ansi reset)(ansi cyan)(($frames | first))(ansi reset) (ansi grey)running...(ansi reset)\n"

    while (job list | where id == $jid | is-not-empty) {
        let frame = ($frames | get ($f_idx mod $frames_len))
        $f_idx = ($f_idx + 1)

        let raw_lines = if ($log_file | path exists) {
            open --raw $log_file | lines | where { $in | is-not-empty } | last 8
        } else { [] }

        # Rewind previous lines + placeholder header
        let rewind_count = ($lines_shown + 1)
        print -n $"\e[($rewind_count)A\e[0J\r\e[2K"
        print $"  (chevron) (ansi grey)($engine | fill -w 14)(ansi reset)(ansi default_bold)($name | fill -w 8)(ansi reset)(ansi cyan)($frame)(ansi reset) (ansi grey)running...(ansi reset)"
        for l in $raw_lines {
            let trimmed = ($l | str trim)
            let line_preview = if ($trimmed | str length) > 100 { ($trimmed | str substring 0..97) + "..." } else { $trimmed }
            print $"    (ansi grey)│(ansi reset) (ansi d)(ansi grey)($line_preview)(ansi reset)"
        }
        $lines_shown = ($raw_lines | length)
        sleep 70ms
    }

    # Clean up all ephemeral viewport lines and placeholder row
    let total_rewind = ($lines_shown + 1)
    print -n $"\e[($total_rewind)A\e[0J\r\e[2K"

    let elapsed = ((date now) - $start)
    let output_text = if ($log_file | path exists) { open --raw $log_file } else { "" }
    let res_data = if ($res_file | path exists) { open $res_file } else { { exit_code: 0 } }
    rm -f $log_file $res_file

    {
        stdout: $output_text
        stderr: ""
        exit_code: ($res_data.exit_code? | default 0)
        elapsed: $elapsed
    }
}

# --- Generalized Suite Runner ---

export def run-suite [
    title: string
    categories: list<record>
    is_verbose: bool = false
    --cmd-preview: string = ""
    --resolver: closure
    --evaluator: closure
    --success-msg: string
    --fail-msg: closure
]: nothing -> nothing {
    banner $title "212"
    if ($cmd_preview | is-not-empty) {
        render-cmd-preview $cmd_preview
    }

    mut total_errors = 0
    mut summary_rows = []

    for $cat in $categories {
        if ($cat.name? | default "" | is-not-empty) {
            print $"(ansi purple_bold)[($cat.name)](ansi reset)"
        }

        for $pkg in $cat.targets {
            let plan = (do $resolver $pkg)

            # 1. Check if skipped (e.g. no tests)
            if ($plan.skip? | default "" | is-not-empty) {
                let skip_badge = ($plan.badge? | default "")
                let full_badge = $"($skip_badge) (ansi grey)[($plan.skip)](ansi reset)"
                print $"  (chevron) (ansi grey)($plan.engine | fill -w 14)(ansi reset)(ansi default_bold)($pkg.name | fill -w 8)(ansi reset)($full_badge)"

                if $is_verbose {
                    $summary_rows = ($summary_rows | append {
                        cat: ($cat.name? | default "")
                        engine: $plan.engine
                        name: $pkg.name
                        badge: $full_badge
                        is_err: false
                    })
                }
                continue
            }

            # 2. Optional pre-flight hook (e.g. svelte-kit sync)
            if ($plan.pre? != null) {
                do $plan.pre
            }

            # 3. Execute step with live ephemeral viewport
            let cwd = ($plan.cwd? | default "")
            let res = (exec-step $"Running ($plan.engine) for ($pkg.name)..." $plan.cmd $is_verbose --cwd $cwd --engine $plan.engine --name $pkg.name)

            # 4. Evaluate and parse outputs
            let eval = (do $evaluator $res $pkg)
            $total_errors = ($total_errors + $eval.err_count)

            # 5. Format and print status row
            print $"  (chevron) (ansi grey)($plan.engine | fill -w 14)(ansi reset)(ansi default_bold)($pkg.name | fill -w 8)(ansi reset)($eval.badge)"

            # 6. Stream logs if verbose or on error
            print-stream $res $is_verbose $eval.is_err

            if $is_verbose {
                $summary_rows = ($summary_rows | append {
                    cat: ($cat.name? | default "")
                    engine: $plan.engine
                    name: $pkg.name
                    badge: $eval.badge
                    is_err: $eval.is_err
                })
            }
        }
        print ""
    }

    # 7. Post-Noise Consolidated Overview in Verbose Mode
    if $is_verbose and ($summary_rows | is-not-empty) {
        print $"(ansi purple_bold)📊 OVERVIEW(ansi reset)"
        mut last_cat = ""
        for $row in $summary_rows {
            let cat_name = ($row.cat | default "")
            if ($cat_name | is-not-empty) and ($cat_name != $last_cat) {
                print $"(ansi purple_bold)[($cat_name)](ansi reset)"
                $last_cat = $cat_name
            }
            print $"  (chevron) (ansi grey)($row.engine | fill -w 14)(ansi reset)(ansi default_bold)($row.name | fill -w 8)(ansi reset)($row.badge)"
        }
        print ""
    }

    # 8. Final Banner
    if $total_errors > 0 {
        banner (do $fail_msg $total_errors) "196"
        exit 1
    } else {
        banner $success_msg "48"
    }
}
