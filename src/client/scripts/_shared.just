# _shared.just — vars, private helpers, and the front door. Shared into every
# layer via `import`; settings and variables live here once.

PROJECT := "gwa-client"
VERSION := `open deno.json | get version`
CLIENT_DIR := parent_directory(source_directory())
HARNESS_NU := source_directory() / "cli"
JUSTFILE := CLIENT_DIR / "client.just"

[default]
[doc('List all available client recipes')]
[group('meta')]
list:
    @just --justfile '{{ JUSTFILE }}' --list --unsorted

# Interactive autocomplete over client recipes with syntax-highlighted previews.
[doc('Interactive recipe picker (fuzzy-filtered via gum with syntax-highlighted previews)')]
[group('meta')]
[script]
menu:
    let data = (^just --justfile '{{ JUSTFILE }}' --dump --dump-format json | from json)
    let recipes = ($data.recipes | transpose name info 
        | where { not ($in.info.private? | default false) }
        | each {|r|
            let grp = ($r.info.attributes? | default [] | where { ($in | describe) =~ "record" and ($in.group? != null) } | get 0?.group? | default "other")
            let doc = ($r.info.doc? | default "")
            let params = ($r.info.parameters? | default [] | each {|p|
                let is_variadic = ($p.kind? == "star" or $p.kind? == "plus")
                let prefix = if $is_variadic { "*" } else { "" }
                let def_val = if ($p.default? != null) { $"='($p.default)'" } else { "" }
                $"($prefix)($p.name)($def_val)"
            } | str join " ")
            { name: $r.name, group: $grp, doc: $doc, params: $params }
        }
    )

    let groups = ["dev" "test" "check" "deploy" "ci" "meta"]
    let grouped_lines = ($groups | each {|g|
        let items = ($recipes | where group == $g | sort-by name)
        if ($items | is-empty) { "" } else {
            let rendered = ($items | each {|r|
                let tag = $"(ansi yellow)[($r.group | fill -w 6)](ansi reset)"
                let fn_name = $"(ansi white_bold)($r.name | fill -w 10)(ansi reset)"
                let args_str = if ($r.params | is-not-empty) { $"(ansi cyan)($r.params | fill -w 14)(ansi reset)" } else { (" " | fill -w 14) }
                let comment = if ($r.doc | is-not-empty) { $"(ansi blue)# ($r.doc)(ansi reset)" } else { "" }
                $"($tag) ($fn_name) ($args_str) ($comment)"
            })
            ($rendered | str join "\n")
        }
    } | where { $in | is-not-empty })

    let choice = ($grouped_lines | str join "\n\n" | ^gum filter --no-strip-ansi --indicator="❯ " --indicator.foreground="212" --match.foreground="212" --header="🔮 GWA Client Recipe Launcher" --placeholder="Search recipes (e.g. test, check, build)..." --height=20) | str trim
    if ($choice | is-not-empty) {
        let selected = ($choice | ansi strip | parse -r "^\\[.*?\\]\\s+(?P<name>\\S+)" | get 0?.name? | default "")
        if ($selected | is-not-empty) {
            ^just --justfile '{{ JUSTFILE }}' $selected
        }
    }

[private]
[group('meta')]
[script]
_banner msg:
    ^gum style --foreground 212 --border rounded --padding "0 2" "{{msg}}"

[private]
[group('meta')]
[script]
_clean-tree:
    if (^git status --porcelain | is-not-empty) { error make {msg: "working tree dirty"} }

[doc('Compile an inlang project into a paraglide runtime')]
[group('build')]
_paraglide project outdir:
    ^deno run -A npm:@inlang/paraglide-js compile --project "{{ project }}" --outdir "{{ outdir }}" --emit-ts-declarations
