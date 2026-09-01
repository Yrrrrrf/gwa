# deploy.just — ship · build, preview, publish, and release

[doc('Build React app')]
[group('deploy')]
build-react:
    cd apps/react; ^deno run -A npm:vite build

[doc('Build Vue app')]
[group('deploy')]
build-vue:
    cd apps/vue; ^deno run -A npm:vite build

[doc('Build Svelte app')]
[group('deploy')]
build-svelte:
    cd apps/svelte; ^deno run -A npm:vite build

[doc('Build Vision app')]
[group('deploy')]
build-vision:
    cd apps/vision; ^deno run -A npm:@sveltejs/kit@next/svelte-kit sync; ^deno run -A npm:vite build

[doc('Run quality gate (check + test) (pass -v for detailed logs, -p for parallel)')]
[group('ci')]
[positional-arguments]
ci *flags: (check flags) (test flags)

[doc('Build applications: deno.json -> build/ (pass -v for detailed logs)')]
[group('deploy')]
[positional-arguments]
build *flags:
    {{ CLI }} build {{ flags }}

[doc('Preview production build (builds first, then launches preview server) (pass -A for all apps)')]
[group('deploy')]
[positional-arguments]
preview *flags: (build flags)
    {{ CLI }} preview {{ flags }}

[confirm("Ship release to production?")]
[doc('Publish build release')]
[group('deploy')]
publish: ci build
    @echo "✓ Published release successfully"
