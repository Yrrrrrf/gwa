# _shared.just — vars, private helpers, and the front door. Shared into every
# layer via `import`; settings and variables live here once.

PROJECT := "gwa-client"
VERSION := `open deno.json | get version`
CLIENT_DIR := parent_directory(source_directory())
HARNESS_NU := source_directory() / "harness.nu"
JUSTFILE := CLIENT_DIR / "client.just"

[default]
[doc('List all available client recipes')]
[group('meta')]
list:
    @just --justfile '{{ JUSTFILE }}' --list --unsorted

# Interactive autocomplete over client recipes — type to fuzzy-filter.
[doc('Interactive recipe picker (fuzzy-filtered via gum)')]
[group('meta')]
menu:
    #!/usr/bin/env nu
    let recipes = (just --justfile '{{ JUSTFILE }}' --summary | str trim | split row ' ')
    let choice = ($recipes | str join "\n" | ^gum filter --placeholder "{{ PROJECT }} recipe...") | str trim
    if ($choice | is-not-empty) { just --justfile '{{ JUSTFILE }}' $choice }

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

[doc('Compile an inlang project into a paraglide runtime')]
[group('build')]
_paraglide project outdir:
    deno run -A npm:@inlang/paraglide-js compile --project "{{ project }}" --outdir "{{ outdir }}" --emit-ts-declarations
