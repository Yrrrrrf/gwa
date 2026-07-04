[doc('Sync SvelteKit UI and Compile Paraglide translation files')]
[group('dev')]
sync-ui:
    deno run -A npm:@inlang/paraglide-js compile --project ./sdk/ui/src/i18n/project.inlang --outdir ./sdk/ui/src/i18n/paraglide
    cd sdk/ui; deno run -A npm:svelte-kit sync

[doc('Build all apps or a specific one')]
[group('dev')]
build app='': sync-ui
    #!/usr/bin/env nu
    if ("{{app}}" | is-empty) {
        let base = $env.PWD
        for dir in (ls apps | get name) {
            if ($dir | path type) == "dir" {
                cd $dir
                deno run -A npm:vite build
                cd $base
            }
        }
    } else {
        cd $"apps/{{app}}"
        deno run -A npm:vite build
    }

[doc('Preview a built app')]
[group('dev')]
[working-directory('apps')]
preview app='vision': (build app)
    cd {{ app }} && deno run -A npm:vite preview

[doc('Run an app in development mode')]
[group('dev')]
[working-directory('apps')]
run app='vision':
    cd {{ app }} && deno run -A npm:vite dev

# todo: Implement pwa-check in src/client/scripts/pwa-check.nu
[doc('Verify PWA installability flags')]
[group('dev')]
pwa-check:
    error make {msg: "pwa-check not implemented — expected script src/client/scripts/pwa-check.nu is missing"}
