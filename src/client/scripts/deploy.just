[doc('Run quality gate (check + test)')]
[group('ci')]
ci: check test

[doc('Build the application: deno.json -> build/')]
[group('deploy')]
build app='vision':
    rm -rf build
    cd apps/{{ app }}; deno run -A npm:vite-plus/vp build
    @echo "✓ build done"

[doc('Preview production build')]
[group('deploy')]
preview app='vision':
    cd apps/{{ app }}; deno run -A npm:vite-plus/vp preview

[doc('Publish build release')]
[group('deploy')]
publish: ci build
    @echo "✓ publish done"
