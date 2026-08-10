# Both recipes depend on `inject` (which runs `build` first), so every app
# session consumes the freshly built pkg from node_modules — like a real user.

[doc('Run an app on the dev server against the freshly injected pkg')]
[group('Dev')]
run app='vision':
    cd apps/{{ app }}; deno run -A npm:vite dev --host

[doc('Production-build and preview an app against the freshly injected pkg')]
[group('Dev')]
preview app='vision': (build app)
    echo {{ app }}
    cd apps/{{ app }}; deno run -A npm:vite preview
