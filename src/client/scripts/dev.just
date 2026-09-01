# dev.just — run, live preview, and prepare workspace

[doc('Run an app on the dev server')]
[group('dev')]
[positional-arguments]
dev *flags:
    {{ CLI }} dev {{ flags }}

alias run := dev

[doc('Prune all node_modules, .svelte-kit, .vite, deno.lock, build/, dist/, paraglide')]
[group('dev')]
[script]
prune:
    let targets = [
        "node_modules"
        ".svelte-kit"
        ".vite"
        "deno.lock"
        "build"
        "dist"
        "paraglide"
    ]
    let pattern = ("^(" + ($targets | str join "|") + ")$")
    let matches = (fd -u --prune $pattern | lines)
    $matches | each {|p|
        rm -r -f $p
        print $"rm ($p)"
    } | ignore
    print "Workspace clean\n"

[doc('Purge caches & lockfiles, reinstall deps, resync generated code')]
[group('dev')]
prepare: prune
    ^deno install
    cd apps/vision; ^deno run -A npm:@sveltejs/kit@next/svelte-kit sync
