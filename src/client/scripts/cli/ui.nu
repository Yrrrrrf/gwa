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

export def format-duration [d: duration]: nothing -> string {
    let ms = ($d | into int) / 1_000_000
    if $ms < 1000 {
        $"($ms | math round)ms"
    } else {
        let sec = ($ms / 1000)
        $"($sec | math round -p 2)s"
    }
}

# Native ANSI banner — zero external process, zero OSC 11 background leaks
export def banner [text: string, color: string = "212"]: nothing -> nothing {
    print ""
    print $"(ansi -e { fg: $color, attr: b })($text)(ansi reset)"
}

# Template command: crisp distinct style (not dim) with <placeholders> in bold cyan
export def render-cmd-template [text: string]: nothing -> nothing {
    let styled = ($text | str replace --all --regex "<([^>]+)>" $"(ansi reset)(ansi cyan_bold)<$1>(ansi reset)(ansi default_italic)")
    print ""
    print $"  (ansi default_italic)($styled)(ansi reset)"
    print ""
}

# Concrete commands manifest: bold text at 0 tabs (no leading indent)
export def render-cmd-list [cmds: list<string>]: nothing -> nothing {
    for cmd in $cmds {
        let clean = ($cmd | str replace --all "<" "" | str replace --all ">" "")
        print $"(ansi default_bold)($clean)(ansi reset)"
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
