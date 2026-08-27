# runner.nu — generic execution step, suite coordinator, output parsers, and live viewport
use ui.nu [chevron badge banner render-cmd-template render-cmd-list print-stream format-duration SPINNER_FRAMES]

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

# --- Table Line Builder ---

def build-table-lines [
    records: list<record>
    frame: string = ""
]: nothing -> list<string> {
    mut lines = []
    mut last_cat = ""
    for rec in $records {
        let cat_name = ($rec.cat | default "")
        if ($cat_name | is-not-empty) and ($cat_name != $last_cat) {
            if ($last_cat | is-not-empty) {
                $lines = ($lines | append "")
            }
            $lines = ($lines | append $"(ansi purple_bold)[($cat_name)](ansi reset)")
            $last_cat = $cat_name
        }

        let status_str = if $rec.status == "pending" {
            $"(ansi grey)\(pending\)(ansi reset)"
        } else if $rec.status == "running" {
            let rec_start = ($rec.start? | default (date now))
            let rec_elapsed = ((date now) - $rec_start)
            let live_clock = if ($rec_elapsed > 0ns) {
                $" (ansi grey)\((format-duration $rec_elapsed)\)(ansi reset)"
            } else { "" }
            $"(ansi cyan)($frame)(ansi reset) (ansi grey)running...(ansi reset)($live_clock)"
        } else if $rec.status == "skipped" {
            $rec.badge
        } else {
            let dur_tag = if ($rec.dur | is-not-empty) {
                $" (ansi grey)\(($rec.dur)\)(ansi reset)"
            } else { "" }
            $"($rec.badge)($dur_tag)"
        }

        let row = $"  (chevron) (ansi grey)($rec.engine | fill -w 14)(ansi reset)(ansi default_bold)($rec.name | fill -w 8)(ansi reset)($status_str)"
        $lines = ($lines | append $row)
    }
    $lines
}

# --- Generalized Suite Runner ---

export def run-suite [
    title: string
    categories: list<record>
    is_verbose: bool = false
    is_parallel: bool = false
    --cmd-preview: string = ""
    --resolver: closure
    --evaluator: closure
    --success-msg: string
    --fail-msg: closure
]: nothing -> nothing {
    let suite_start = (date now)

    # 1. Render Template Preview (crisp non-dim italic, bold cyan <placeholders>)
    if ($cmd_preview | is-not-empty) {
        render-cmd-template $cmd_preview
    }

    # 2. Collect Concrete Commands Manifest & Pre-build State Model
    mut concrete_cmds = []
    mut state_records = []

    for cat in $categories {
        let cat_name = ($cat.name? | default "")
        for pkg in $cat.targets {
            let plan = (do $resolver $pkg)

            if ($plan.display_cmd? | default "" | is-not-empty) {
                $concrete_cmds = ($concrete_cmds | append $plan.display_cmd)
            }

            let is_skipped = ($plan.skip? | default "" | is-not-empty)
            let skip_badge = if $is_skipped {
                let sb = ($plan.badge? | default "")
                $"($sb) (ansi grey)[($plan.skip)](ansi reset)"
            } else { "" }

            $state_records = ($state_records | append {
                cat: $cat_name
                pkg: $pkg
                plan: $plan
                engine: $plan.engine
                name: $pkg.name
                status: (if $is_skipped { "skipped" } else { "pending" })
                badge: $skip_badge
                dur: ""
                is_err: false
            })
        }
    }

    mut total_errors = 0
    let is_tty = (is-terminal --stdout)

    # In standard mode, render the concrete command list upfront
    if (not $is_verbose) and ($concrete_cmds | is-not-empty) {
        print ""
        render-cmd-list $concrete_cmds
    }

    # Render initial bottom table (visible from the start in both modes)
    print ""
    let initial_table = (build-table-lines $state_records)
    print ($initial_table | str join "\n")
    mut table_height = ($initial_table | length)

    if $is_parallel {
        # --- PARALLEL EXECUTION MODE ---
        # 1. Run any pre-steps sequentially first (e.g. svelte-kit sync)
        for rec in $state_records {
            if ($rec.status != "skipped") and ($rec.plan.pre? != null) {
                do $rec.plan.pre
            }
        }

        # 2. In verbose mode, print all triggering commands above the initial table
        if $is_verbose and $is_tty {
            print -n $"\e[($table_height)A\e[0J\r\e[2K"
            for rec in $state_records {
                if $rec.status != "skipped" {
                    let raw_cmd = ($rec.plan.display_cmd? | default ($rec.plan.cmd | str join ' '))
                    let cmd_clean = ($raw_cmd | str replace --all "<" "" | str replace --all ">" "")
                    print $"($cmd_clean)"
                }
            }
            print ""
            let cur_tbl = (build-table-lines $state_records "⠋")
            print ($cur_tbl | str join "\n")
            $table_height = ($cur_tbl | length)
        }

        # 3. Spawn all active jobs in parallel
        for i in 0..(($state_records | length) - 1) {
            let rec = ($state_records | get $i)
            if $rec.status != "skipped" {
                let log_file = (mktemp -t "gwa-p-stream-XXXXXX.log")
                let res_file = (mktemp -t "gwa-p-res-XXXXXX.nuon")
                let exe = ($rec.plan.cmd | first)
                let args = ($rec.plan.cmd | skip 1)
                let cwd = ($rec.plan.cwd? | default "")
                let start = (date now)

                let jid = (job spawn {
                    $env.FORCE_COLOR = "1"
                    $env.CLICOLOR_FORCE = "1"
                    $env.DENO_NO_PROMPT = "1"
                    try {
                        if ($cwd | is-not-empty) {
                            cd $cwd
                            ^$exe ...$args o+e> $log_file
                        } else {
                            ^$exe ...$args o+e> $log_file
                        }
                    } catch { }
                    let code = $env.LAST_EXIT_CODE
                    { exit_code: $code } | to nuon | save -f $res_file
                })

                $state_records = ($state_records | update $i {
                    cat: $rec.cat
                    pkg: $rec.pkg
                    plan: $rec.plan
                    engine: $rec.engine
                    name: $rec.name
                    status: "running"
                    badge: $rec.badge
                    dur: ""
                    is_err: false
                    start: $start
                    jid: $jid
                    log_file: $log_file
                    res_file: $res_file
                })
            }
        }

        mut f_idx = 0
        let frames = $SPINNER_FRAMES
        let frames_len = ($frames | length)

        # 4. Multi-job animation ticker (all rows ticking concurrently at 60fps)
        while ($state_records | any { $in.status == "running" }) {
            let frame = ($frames | get ($f_idx mod $frames_len))
            $f_idx = ($f_idx + 1)
            let cur_jobs = (job list)

            for i in 0..(($state_records | length) - 1) {
                let rec = ($state_records | get $i)
                if $rec.status == "running" {
                    let jid = $rec.jid
                    if not ($cur_jobs | any { $in.id == $jid }) {
                        # Job completed!
                        let elapsed = ((date now) - $rec.start)
                        let output_text = if ($rec.log_file | path exists) { open --raw $rec.log_file } else { "" }
                        let res_data = if ($rec.res_file | path exists) { open $rec.res_file } else { { exit_code: 0 } }
                        rm -f $rec.log_file $rec.res_file

                        let res_record = {
                            stdout: $output_text
                            stderr: ""
                            exit_code: ($res_data.exit_code? | default 0)
                            elapsed: $elapsed
                        }

                        let eval = (do $evaluator $res_record $rec.pkg)
                        $total_errors = ($total_errors + $eval.err_count)
                        let dur_val = if ($eval.is_err) { "" } else { (format-duration $elapsed) }

                        $state_records = ($state_records | update $i {
                            cat: $rec.cat
                            pkg: $rec.pkg
                            plan: $rec.plan
                            engine: $rec.engine
                            name: $rec.name
                            status: (if $eval.is_err { "failed" } else { "done" })
                            badge: $eval.badge
                            dur: $dur_val
                            is_err: $eval.is_err
                            start: $rec.start
                            output: $output_text
                        })
                    }
                }
            }

            if $is_tty {
                print -n $"\e[($table_height)A\r\e[0J"
                let cur_tbl = (build-table-lines $state_records $frame)
                print ($cur_tbl | str join "\n")
            }

            sleep 60ms
        }

        # Clear table for final render
        if $is_tty {
            print -n $"\e[($table_height)A\e[0J\r\e[2K"
        }

        if $is_verbose and $is_tty {
            for rec in $state_records {
                if $rec.status in ["done", "failed"] {
                    let raw_cmd = ($rec.plan.display_cmd? | default ($rec.plan.cmd | str join ' '))
                    let cmd_clean = ($raw_cmd | str replace --all "<" "" | str replace --all ">" "")
                    print $"($cmd_clean)"
                    let logs = ($rec.output? | default "" | lines)
                    for l in $logs {
                        print $"    (ansi grey)│(ansi reset) ($l)(ansi reset)"
                    }
                    print ""
                }
            }
        } else {
            for rec in $state_records {
                if ($rec.is_err? | default false) {
                    let err_lines = (
                        $rec.output? | default ""
                        | lines
                        | where { $in | is-not-empty }
                        | last 15
                        | each {|l| $"    (ansi red)│(ansi reset) ($l)" }
                    )
                    if ($err_lines | is-not-empty) {
                        print ($err_lines | str join "\n")
                        print ""
                    }
                }
            }
        }

        let final_table = (build-table-lines $state_records)
        print ($final_table | str join "\n")
        $table_height = ($final_table | length)
    } else {
        # --- SEQUENTIAL EXECUTION MODE ---
        for i in 0..(($state_records | length) - 1) {
            let rec = ($state_records | get $i)
            if $rec.status == "skipped" {
                continue
            }

            let plan = $rec.plan
            if ($plan.pre? != null) {
                do $plan.pre
            }

            let start = (date now)

            # Update state to running
            $state_records = ($state_records | update $i {
                cat: $rec.cat
                pkg: $rec.pkg
                plan: $rec.plan
                engine: $rec.engine
                name: $rec.name
                status: "running"
                badge: $rec.badge
                dur: ""
                start: $start
                is_err: false
            })

            # In verbose mode, clear table, print the triggering command above table, and redraw table
            if $is_verbose and $is_tty {
                let raw_cmd = (
                    $plan.display_cmd?
                    | default ($plan.cmd | str join ' ')
                )
                let cmd_clean = ($raw_cmd | str replace --all "<" "" | str replace --all ">" "")
                print -n $"\e[($table_height)A\e[0J\r\e[2K"
                print $"($cmd_clean)"
                let cur_tbl = (build-table-lines $state_records "⠋")
                print ($cur_tbl | str join "\n")
                $table_height = ($cur_tbl | length)
            }

            let log_file = (mktemp -t "gwa-stream-XXXXXX.log")
            let res_file = (mktemp -t "gwa-res-XXXXXX.nuon")
            let exe = ($plan.cmd | first)
            let args = ($plan.cmd | skip 1)
            let cwd = ($plan.cwd? | default "")

            let jid = (job spawn {
                $env.FORCE_COLOR = "1"
                $env.CLICOLOR_FORCE = "1"
                $env.DENO_NO_PROMPT = "1"
                try {
                    if ($cwd | is-not-empty) {
                        cd $cwd
                        ^$exe ...$args o+e> $log_file
                    } else {
                        ^$exe ...$args o+e> $log_file
                    }
                } catch { }
                let code = $env.LAST_EXIT_CODE
                { exit_code: $code } | to nuon | save -f $res_file
            })

            mut f_idx = 0
            mut last_line_count = 0
            let frames = $SPINNER_FRAMES
            let frames_len = ($frames | length)

            while (job list | where id == $jid | is-not-empty) {
                let frame = ($frames | get ($f_idx mod $frames_len))
                $f_idx = ($f_idx + 1)

                if $is_tty {
                    if $is_verbose {
                        let all_logs = if ($log_file | path exists) { open --raw $log_file | lines } else { [] }
                        let new_logs = ($all_logs | skip $last_line_count)

                        if ($new_logs | is-not-empty) {
                            # Clear table, stream new logs above table, redraw table below
                            print -n $"\e[($table_height)A\e[0J\r\e[2K"
                            for l in $new_logs {
                                print $"    (ansi grey)│(ansi reset) ($l)(ansi reset)"
                            }
                            let cur_tbl = (build-table-lines $state_records $frame)
                            print ($cur_tbl | str join "\n")
                            $table_height = ($cur_tbl | length)
                            $last_line_count = ($all_logs | length)
                        } else {
                            # Update spinner and live clock in table
                            print -n $"\e[($table_height)A\r\e[0J"
                            let cur_tbl = (build-table-lines $state_records $frame)
                            print ($cur_tbl | str join "\n")
                        }
                    } else {
                        # Standard mode: update spinner and live clock in table
                        print -n $"\e[($table_height)A\r\e[0J"
                        let cur_tbl = (build-table-lines $state_records $frame)
                        print ($cur_tbl | str join "\n")
                    }
                }

                sleep 60ms
            }

            # Clear table for final task state transition
            if $is_tty {
                print -n $"\e[($table_height)A\e[0J\r\e[2K"
            }

            let elapsed = ((date now) - $start)
            let output_text = if ($log_file | path exists) { open --raw $log_file } else { "" }
            let res_data = if ($res_file | path exists) { open $res_file } else { { exit_code: 0 } }
            rm -f $log_file $res_file

            let res_record = {
                stdout: $output_text
                stderr: ""
                exit_code: ($res_data.exit_code? | default 0)
                elapsed: $elapsed
            }

            let eval = (do $evaluator $res_record $rec.pkg)
            $total_errors = ($total_errors + $eval.err_count)

            # In verbose mode, flush any remaining log lines and add spacing before the table
            if $is_verbose and $is_tty {
                let all_logs = ($output_text | lines)
                let remaining = ($all_logs | skip $last_line_count)
                for l in $remaining {
                    print $"    (ansi grey)│(ansi reset) ($l)(ansi reset)"
                }
                print ""
            }

            # If task failed in standard mode, print failure error trace above the table
            if (not $is_verbose) and $eval.is_err {
                let err_lines = (
                    $output_text
                    | lines
                    | where { $in | is-not-empty }
                    | last 15
                    | each {|l| $"    (ansi red)│(ansi reset) ($l)" }
                )
                if ($err_lines | is-not-empty) {
                    print ($err_lines | str join "\n")
                    print ""
                }
            }

            # Update table record with completed state and duration
            let dur_val = if ($eval.is_err) { "" } else { (format-duration $elapsed) }
            $state_records = ($state_records | update $i {
                cat: $rec.cat
                pkg: $rec.pkg
                plan: $rec.plan
                engine: $rec.engine
                name: $rec.name
                status: (if $eval.is_err { "failed" } else { "done" })
                badge: $eval.badge
                dur: $dur_val
                is_err: $eval.is_err
            })

            # Redraw table cleanly below
            let updated_table = (build-table-lines $state_records)
            print ($updated_table | str join "\n")
            $table_height = ($updated_table | length)
        }
    }

    # Final Banner
    let suite_elapsed = ((date now) - $suite_start)
    let total_dur_suffix = $" (ansi grey)\(total: (format-duration $suite_elapsed)\)(ansi reset)"
    if $total_errors > 0 {
        banner $"((do $fail_msg $total_errors))($total_dur_suffix)" "196"
        exit 1
    } else {
        banner $"($success_msg)($total_dur_suffix)" "48"
    }
}
