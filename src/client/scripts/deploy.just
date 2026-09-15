# deploy.just — ship · build, preview, publish, and release

[doc('Run quality gate (check + test) (pass -v for detailed logs, -p for parallel)')]
[group('ci')]
[positional-arguments]
ci *flags: (test flags) (check flags)

[doc('Build applications: deno.json -> build/ (pass -v for detailed logs)')]
[group('deploy')]
[positional-arguments]
build *flags:
    ^{{ CLI }} exec {{ flags }} --title BUILD --select all --cwd 'apps/*' -- deno run -A npm:vite build

[doc('Preview production build (builds first, then launches preview server)')]
[group('deploy')]
[positional-arguments]
preview *flags: (build flags)
    ^{{ CLI }} exec {{ flags }} --title PREVIEW --select one --cwd 'apps/*' -- deno run -A npm:vite preview

[confirm("Ship release to production?")]
[doc('Publish build release')]
[group('deploy')]
publish: ci build
    @echo "✓ Published release successfully"

cycle: prepare (ci "-vp") build
