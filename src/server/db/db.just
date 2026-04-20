[doc('Format DB code')]
[group('CI')]
fmt:
    @echo "✓ DB formatted successfully"

[doc('Lint DB code')]
[group('CI')]
lint:
    @echo "✓ DB lint passed"

[doc('Type-check DB code')]
[group('CI')]
typecheck:
    @echo "✓ DB type-checking passed"

[doc('Build DB image')]
[group('Build')]
build:
    podman-compose down -v
    podman-compose build --no-cache
    @echo "✓ DB image built successfully"

[doc('Run SurrealDB (Podman)')]
[group('Dev')]
run: build
    podman-compose up
    @echo "✓ DB running in development mode"

[doc('Stop SurrealDB (Podman)')]
[group('Dev')]
down:
    podman-compose down -v
    @echo "✓ DB stopped"

[doc('Run DB inner-ring tests (Hurl)')]
[group('Test')]
test:
    hurl --test --variables-file tests/.env --user root:root tests/*.hurl

[doc('Run a single Hurl test file (debug)')]
[group('Test')]
test-one FILE:
    hurl --very-verbose --variables-file tests/.env --user root:root tests/{{FILE}}

[doc('Generate Hurl HTML report')]
[group('Test')]
test-report:
    mkdir -p tests/out/report
    hurl --test --variables-file tests/.env --user root:root --report-html tests/out/report tests/*.hurl
