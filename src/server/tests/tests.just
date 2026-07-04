set shell := ["nu", "-c"]

[default]
list:
    @just --list --unsorted

[doc('Format test suite')]
[group('check')]
fmt:
    deno fmt .

[doc('Lint test suite')]
[group('check')]
lint:
    deno lint .

# The suite's imports resolve through npm/node_modules without a deno.json import map,
# so `deno check` cannot resolve them today; type safety is enforced by vite-plus at run time;
# Revisit when an import map lands.
[doc('Type-check test suite')]
[group('check')]
types:
    @echo "types: skipping deno check (enforced at runtime by vite-plus)"

[doc('Run all code checks')]
[group('check')]
check: fmt lint types

[doc('Run the test suite via vite-plus')]
[group('test')]
test:
    deno run -A npm:vite-plus/vp test
