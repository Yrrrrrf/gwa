[doc('Run quality gate (check + test)')]
[group('ci')]
ci: check test

[doc('Prune all node_modules, .svelte-kit, .vite, deno.lock')]
prune:
    fd -u --prune '^(node_modules|\.svelte-kit|\.vite|deno\.lock)$' | lines | each {|p| rm -r -f $p }

[doc('Purge caches & lockfiles, reinstall deps, resync generated code')]
[group('ci')]
prepare: prune
    # Install on workspace
    deno install
    # Compile paraglide
    # todo: Move this to the main paraglide recipe...
    # just _paraglide src/packages/plugins/i18n/src/lang/project.inlang src/packages/plugins/i18n/src/lang/paraglide
    # Install on main lab for testing...
    # cd apps/lab; deno install
    cd apps/vision; deno run -A npm:@sveltejs/kit/svelte-kit sync
