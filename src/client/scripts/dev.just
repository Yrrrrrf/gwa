# dev.just — run, live preview, and prepare workspace

[doc('Run an app on the dev server')]
[group('dev')]
run *flags:
    {{ CLI }} dev {{ flags }}

[doc('Run an app on the dev server (alias for run)')]
[group('dev')]
dev *flags:
    {{ CLI }} dev {{ flags }}

[doc('Purge caches & lockfiles, reinstall deps, resync generated code')]
[group('dev')]
prepare:
    {{ CLI }} prepare

[doc('Prune all node_modules, .svelte-kit, .vite, deno.lock')]
[group('dev')]
prune:
    {{ CLI }} prune
