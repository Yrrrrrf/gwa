# _shared.just — vars, private helpers, and the front door. Shared into every
# layer via `import`; settings and variables live here once.

PROJECT := "gwa-server-engine"
VERSION := `open ../../client/deno.json | get version`

[default]
[doc('Show Engine help menu')]
[group('meta')]
list:
    @just --list --unsorted

[doc('Interactive recipe picker (fuzzy-filtered via gum)')]
[group('meta')]
menu:
    #!/usr/bin/env nu
    let recipes = (just --summary | str trim | split row ' ')
    let choice = ($recipes | str join "\n" | ^gum filter --placeholder ($"($PROJECT) recipe...")) | str trim
    if ($choice | is-not-empty) { just $choice }

[private]
[group('meta')]
_banner msg:
    #!/usr/bin/env nu
    ^gum style --foreground 212 --border rounded --padding "0 2" "{{msg}}"

[private]
[group('meta')]
_clean-tree:
    #!/usr/bin/env nu
    if (git status --porcelain | is-not-empty) { error make {msg: "working tree dirty"} }
