# _shared.just — vars, private helpers, and the front door. Shared into every
# layer via `import`; settings and variables live here once.

PROJECT := "gwa-client"
VERSION := "0.1.0"
CLIENT_DIR := parent_directory(source_directory())
CLI := "deno run -A jsr:@yrrrrrf/dv@0.0.3"
JUSTFILE := CLIENT_DIR / "justfile"

[default]
[doc('List all available client recipes')]
[group('meta')]
list:
    ^{{ CLI }} list --justfile '{{ JUSTFILE }}'

[doc('Choose a recipe and app target')]
[group('meta')]
menu:
    ^{{ CLI }} menu --justfile '{{ JUSTFILE }}' --complete run 'apps/*' --complete preview 'apps/*' --complete build 'apps/*'

[group('meta')]
[private]
_clean-tree:
    git diff --quiet || (echo "working tree dirty" && exit 1)

[doc('Compile an inlang project into a paraglide runtime')]
[group('build')]
_paraglide project outdir:
    ^deno run -A npm:@inlang/paraglide-js compile --project "{{ project }}" --outdir "{{ outdir }}" --emit-ts-declarations
