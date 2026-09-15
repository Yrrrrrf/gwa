# dev.just — run, live preview, and prepare workspace

[doc('Run an app on the dev server')]
[group('dev')]
[positional-arguments]
run *flags:
    ^{{ CLI }} exec {{ flags }} --title DEV --select one --cwd 'apps/*' -- deno run -A npm:vite dev

[doc('Prune all node_modules, .svelte-kit, .vite, deno.lock, build/, dist/, paraglide')]
[group('dev')]
[positional-arguments]
prune *flags:
    ^{{ CLI }} rm --glob '**/node_modules' '**/.svelte-kit' '**/.vite' '**/build' '**/dist' '**/paraglide' 'deno.lock' {{ flags }}

[doc('Purge caches & lockfiles, reinstall deps, resync generated code')]
[group('dev')]
[positional-arguments]
prepare *flags: (prune flags)
    ^deno install --entrypoint npm:typescript@6
    ^deno run -A scripts/compat.ts
    cd apps/vision; ^deno run -A npm:@sveltejs/kit@next/svelte-kit sync
    cd apps/svelte; ^deno run -A npm:@sveltejs/kit@next/svelte-kit sync
