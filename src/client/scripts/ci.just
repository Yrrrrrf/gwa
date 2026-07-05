[doc('Run client CI pipeline (check + test)')]
[group('ci')]
ci: check test

[doc('Purge caches & lockfiles, reinstall deps, resync generated code')]
[group('ci')]
prepare:
    fd -u --prune '^(node_modules|\.svelte-kit|\.vite|deno\.lock)$' | lines | each {|p| rm -r -f $p }
    deno install
    cd sdk/ui; deno run -A npm:@sveltejs/kit/svelte-kit sync
    cd apps/vision; deno run -A npm:@sveltejs/kit/svelte-kit sync