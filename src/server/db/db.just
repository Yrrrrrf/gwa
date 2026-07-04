set shell := ["nu", "-c"]

[default]
list:
    @just --list --unsorted

# No SurrealQL formatter is adopted; this placeholder keeps the verb surface uniform.
[group('check')]
fmt:
    @echo "fmt: no SurrealQL formatter adopted; skipping"

# No SurrealQL linter is adopted; this placeholder keeps the verb surface uniform.
[group('check')]
lint:
    @echo "lint: no SurrealQL linter adopted; skipping"

# No SurrealQL typechecker exists; this placeholder keeps the verb surface uniform.
[group('check')]
types:
    @echo "types: no SurrealQL typechecker exists; skipping"

[doc('Run all code checks')]
[group('check')]
check: fmt lint types

[doc('Build DB image')]
[group('dev')]
build:
    podman-compose down -v
    podman-compose build --no-cache

[doc('Run SurrealDB (Podman)')]
[group('dev')]
run: build
    podman-compose up

[doc('Stop SurrealDB (Podman)')]
[group('dev')]
down:
    podman-compose down -v

[doc('Run DB inner-ring tests (Hurl)')]
[group('test')]
test:
    hurl --test --variables-file tests/.env --user root:root (glob tests/*.hurl)

[doc('Run a single Hurl test file (debug)')]
[group('test')]
test-one FILE:
    hurl --very-verbose --variables-file tests/.env --user root:root tests/{{FILE}}

[doc('Generate Hurl HTML report')]
[group('test')]
test-report:
    mkdir -p tests/out/report
    hurl --test --variables-file tests/.env --user root:root --report-html tests/out/report (glob tests/*.hurl)
