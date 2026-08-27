# ui.nu — terminal styling, badges, banners, command preview, and streaming log formatters

export const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

export def chevron []: nothing -> string {
    $"(ansi cyan_bold)❯❯(ansi reset)"
}

export def metric [n: int, label: string, color: string = "green"]: nothing -> string {
    if $n > 0 {
        $"(ansi $color)($n) ($label)(ansi reset)"
    } else {
        $"(ansi grey)0 ($label)(ansi reset)"
    }
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

export def banner [text: string, color: string = "212"]: nothing -> nothing {
    print ""
    ^gum style --foreground $color --bold $text
}

export def render-cmd-preview [text: string]: nothing -> nothing {
    let styled = ($text | str replace --all --regex "<([^>]+)>" $"(ansi rst)(ansi cyan_bold)<$1>(ansi reset)(ansi i)(ansi grey)")
    print $"  (ansi i)(ansi grey)($styled)(ansi reset)"
    print ""
}

export def clear-viewport [n: int]: nothing -> nothing {
    if $n > 0 {
        print -n $"\e[($n)A\e[0J\r\e[2K"
    } else {
        print -n "\r\e[2K"
    }
}

export def print-stream [res: record, is_verbose: bool, is_err: bool]: nothing -> nothing {
    if ($is_verbose or $is_err) {
        if ($res.stdout? | default "" | str trim | is-not-empty) {
            print ($res.stdout | lines | each {|l| $"    (ansi grey)│(ansi reset) ($l)" } | str join "\n")
        }
        if ($res.stderr? | default "" | str trim | is-not-empty) {
            let bar = if $is_err { "red" } else { "grey" }
            print ($res.stderr | lines | each {|l| $"    (ansi $bar)│(ansi reset) ($l)" } | str join "\n")
        }
    }
}
