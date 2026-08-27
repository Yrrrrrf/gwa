# flags.nu — centralized CLI flag parser for the harness

export def parse-cli-flags [...raw: any]: nothing -> record<v: bool, b: bool, target: string, rest: list<string>> {
    let tokens = (
        $raw
        | flatten
        | each { into string | split row " " }
        | flatten
        | str trim
        | where { $in | is-not-empty }
    )

    let is_v = ($tokens | any { $in in ["-v", "--verbose"] or ($in =~ "^-[a-zA-Z]*v[a-zA-Z]*$") })
    let is_b = ($tokens | any { $in in ["-b", "--bench", "-d", "--duration"] or ($in =~ "^-[a-zA-Z]*[bd][a-zA-Z]*$") })
    let non_flags = ($tokens | where { not ($in starts-with "-") })
    let target = ($non_flags | get 0? | default "")
    let rest = ($tokens | where { not ($in starts-with "-") and ($in != $target) })

    {
        v: $is_v
        b: $is_b
        target: $target
        rest: $rest
    }
}
