[doc('Run an app on the dev server')]
[group('dev')]
run app='vision':
    cd apps/{{ app }}; deno run -A npm:vite-plus/vp dev --host

[doc('Purge caches & lockfiles, reinstall deps, resync generated code')]
[group('dev')]
prepare: prune
    deno install
    cd apps/vision; deno run -A npm:@sveltejs/kit@next/svelte-kit sync

[doc('Prune all node_modules, .svelte-kit, .vite, deno.lock')]
[group('dev')]
prune:
    fd -u --prune '^(node_modules|\.svelte-kit|\.vite|deno\.lock)$' | lines | each {|p| rm -r -f $p }
