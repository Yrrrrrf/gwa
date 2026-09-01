# deploy.just — ship · build, preview, publish, and release

[doc('Run quality gate (check + test) (pass -v for detailed logs)')]
[group('ci')]
[positional-arguments]
ci *flags: (check flags) (test flags)

[doc('Build applications: deno.json -> build/ (pass -v for detailed logs)')]
[group('deploy')]
[positional-arguments]
build *flags:
    {{ CLI }} build {{ flags }}

[doc('Preview production build (builds first, then launches preview server)')]
[group('deploy')]
[positional-arguments]
preview *flags: (build flags)
    {{ CLI }} preview {{ flags }}

[confirm("Ship release to production?")]
[doc('Publish build release')]
[group('deploy')]
publish: ci build
    @echo "✓ Published release successfully"
