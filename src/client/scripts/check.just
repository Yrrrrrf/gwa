[doc('Format workspace')]
[group('check')]
fmt:
    -biome format --write .

[doc('Lint workspace')]
[group('check')]
lint:
    -deno lint .

[doc('Type-check workspace')]
[group('check')]
types:
    -cd src; deno run -A npm:svelte-check --tsconfig ./tsconfig.json
    -cd apps/lab; deno run -A npm:svelte-check --tsconfig ./tsconfig.json

[doc('Audit all code namespaces')]
[group('check')]
audit:
    deno run -A npm:fallow -c src/.fallowrc.json

[doc('Test coverage')]
[group('check')]
coverage:
    deno test --coverage

[doc('Run all check quality gates')]
[group('check')]
check: fmt lint types

[doc('Run biome check. This one is even stricter than deno!')]
[group('check')]
biome:
    just prune
    -biome check --fix .
    just fmt
