[doc('Run quality gate (check + test)')]
[group('ci')]
ci: check test

[doc('Build the application: deno.json -> build/')]
[group('deploy')]
[working-directory('apps')]
build app='vision':
    cd {{ app }}; rm -rf build
    cd {{ app }}; deno run -A npm:vite build
    @echo "✓ build done"

[doc('Preview production build')]
[group('deploy')]
[working-directory('apps')]
preview app='vision': (build app)
    cd {{ app }}; deno run -A npm:vite preview

[doc('Publish build release')]
[group('deploy')]
publish: ci build
    @echo "✓ publish done"
