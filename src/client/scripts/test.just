[doc('Run workspace tests via vite-plus')]
[group('test')]
test-vp:
    deno run -A npm:vite-plus test --config ./config/vitest.config.ts

[doc('Run the test suite across sdk and workspace')]
[group('test')]
test:
    deno test --allow-all sdk/

[doc('Test coverage')]
[group('check')]
coverage:
    deno test --coverage
