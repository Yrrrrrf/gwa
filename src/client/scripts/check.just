[doc('Format workspace')]
[group('check')]
fmt:
    biome format --config-path=config/biome.json --write .

[doc('Lint workspace')]
[group('check')]
lint:
    deno lint .
    -biome lint --config-path=config/biome.json .

[doc('Type-check workspace')]
[group('check')]
types:
    deno check sdk/core/src/mod.ts sdk/api/src/mod.ts sdk/state/src/mod.ts sdk/ui/src/mod.ts
    cd apps/vision; deno run -A npm:@sveltejs/kit@next/svelte-kit sync; deno run -A npm:svelte-check@^4.7.5 --tsconfig ./tsconfig.json --config ./vite.config.ts
    # -biome check --config-path=config/biome.json --fix .

[doc('Audit all code namespaces')]
[group('check')]
audit:
    deno run -A npm:fallow -c config/fallowrc.json

[doc('Run all check quality gates')]
[group('check')]
check: fmt lint types
