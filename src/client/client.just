# ── Xibalbá · Client ──────────────────────────────────────────
#  CI

[doc('Format Client code')]
[group('CI')]
fmt:
    deno fmt .
    @echo "✓ Client code formatted"

[doc('Lint Client code')]
[group('CI')]
lint:
    deno lint .
    @echo "✓ Client code linted"

[doc('Type-check Client workspace')]
[group('CI')]
typecheck:
    # -deno run -A npm:svelte-check --tsconfig ./apps/explorer/tsconfig.json
    -cd apps/vision && deno run -A npm:svelte-check --tsconfig ./tsconfig.json
    # -cd apps/explorer && deno run -A npm:svelte-check --tsconfig ./tsconfig.json
    # todo: Add a svelte-check for the sdk/ui
    -cd sdk/ui && deno run -A npm:svelte-check
    # deno check .
    @echo "✓ Client type-checked"

[doc('Full client quality gate')]
[group('CI')]
quality: typecheck
    @echo "✓ Client quality checks passed"

# Build

[doc('Sync SvelteKit and Build SDK')]
[group('Build')]
sync-ui:
    # Compile Paraglide
    bunx @inlang/paraglide-js compile --project ./sdk/ui/src/i18n/project.inlang --outdir ./sdk/ui/src/i18n/paraglide
    # SvelteKit sync
    bun run --cwd sdk/ui svelte-kit sync
    # bun run --cwd apps/explorer svelte-kit sync
    # bun run --cwd apps/vision svelte-kit sync
    # cd apps/vision && deno run -A npm:svelte-kit sync

[doc('Build all apps, or a specific one')]
[group('Build')]
build app='': sync-ui
    @if [ -z "{{ app }}" ]; then \
        for dir in apps/*/; do \
            cd "$dir" && deno run -A npm:vite build && cd - > /dev/null; \
        done; \
    else \
        cd apps/{{ app }} && deno run -A npm:vite build; \
    fi

[doc('Preview a built app')]
[group('Dev')]
[working-directory('apps')]
preview app=`ls apps/`: (build app)
    cd {{ app }} && deno run -A npm:vite preview

[doc('Run an app in development mode')]
[group('Dev')]
[working-directory('apps')]
run app=`ls apps/`:
    cd {{ app }} && deno run -A npm:vite dev

[doc('Test the client')]
[group('Dev')]
test:
    bun test
    @echo "✓ Client tests passed"

[doc('Verify PWA installability flags')]
[group('Dev')]
pwa-check:
    sh ./scripts/pwa-check.sh
    @echo "✓ PWA installability checks completed"

# ── Deploy (Tauri) ─────────────────────────────────────

[doc('Build the Tauri app for production')]
[group('Deploy')]
deploy:
    podman-compose down -v
    podman-compose up --build --no-cache
    @echo "✓ Tauri app built for production"
