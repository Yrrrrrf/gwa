[doc('Format test suite')]
[group('CI')]
fmt:
    deno fmt .

[doc('Lint test suite')]
[group('CI')]
lint:
    deno lint .

[doc('Type-check test suite')]
[group('CI')]
typecheck:
    deno check .

[doc('Run the unified test suite')]
[group('Test')]
test:
    bun run test:run

[doc('Run DB outer-ring tests')]
[group('Test')]
test-db:
    bun run test:db

[doc('Run Engine outer-ring tests')]
[group('Test')]
test-engine:
    bun run test:engine

[doc('Run RPC outer-ring tests')]
[group('Test')]
test-rpc:
    bun run test:rpc

[doc('Run E2E outer-ring tests')]
[group('Test')]
test-e2e:
    bun run test:e2e
