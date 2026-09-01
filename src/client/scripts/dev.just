# dev.just — run, live preview, and prepare workspace

[doc('Run an app on the dev server')]
[group('dev')]
[positional-arguments]
dev *flags:
    {{ CLI }} dev {{ flags }}

alias run := dev

[doc('Prune all node_modules, .svelte-kit, .vite, deno.lock, build/')]
[group('dev')]
prune:
    fd -u --prune '^(node_modules|\.svelte-kit|\.vite|deno\.lock|build|dist)$' | lines | each {|p| rm -r -f $p } | ignore

[doc('Purge caches & lockfiles, reinstall deps, resync generated code')]
[group('dev')]
prepare: prune
    ^deno install
    cd apps/vision; ^deno run -A npm:@sveltejs/kit@next/svelte-kit sync
