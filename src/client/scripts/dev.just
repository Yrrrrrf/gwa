# Both recipes depend on `inject` (which runs `build` first), so every app
# session consumes the freshly built pkg from node_modules — like a real user.

[doc('Run an app on the dev server against the freshly injected pkg')]
[group('Dev')]
run app='lab': inject
    cd apps/{{ app }}; deno run -A npm:vite dev --host

# todo: Add run/preview/inject variants that iterate over all apps at once :D

[doc('Production-build and preview an app against the freshly injected pkg')]
[group('Dev')]
[working-directory('apps')]
preview app='lab': inject
    @echo "{{ app }}"
    rm -rf "{{ app }}/build"
    cd "{{ app }}"; deno run -A npm:vite build
    cd "{{ app }}"; deno run -A npm:vite preview
