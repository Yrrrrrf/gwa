# dev.just — run, live preview, and prepare workspace

[doc('Run React app on dev server')]
[group('dev')]
dev-react:
    cd apps/react; ^deno run -A npm:vite dev --host

[doc('Run Vue app on dev server')]
[group('dev')]
dev-vue:
    cd apps/vue; ^deno run -A npm:vite dev --host

[doc('Run Svelte app on dev server')]
[group('dev')]
dev-svelte:
    cd apps/svelte; ^deno run -A npm:vite dev --host

[doc('Run Vision app on dev server')]
[group('dev')]
dev-vision:
    cd apps/vision; ^deno run -A npm:vite dev --host

[doc('Run an app on the dev server (pass -A for all apps)')]
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
