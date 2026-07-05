[doc('Format client code')]
[group('check')]
fmt:
    deno fmt .

[doc('Lint client code')]
[group('check')]
lint:
    deno lint .

[doc('Type-check client code')]
[group('check')]
types:
    cd apps/vision; deno run -A npm:svelte-check --tsconfig ./tsconfig.json
    cd sdk/ui; deno run -A npm:svelte-check
    # Add fallow as cmd for each! :D

[doc('Run all client quality gates')]
[group('check')]
check: fmt lint types
