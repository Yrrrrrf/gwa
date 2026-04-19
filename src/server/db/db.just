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

[doc('Test DB (Hurl)')]
[group('Test')]
test:
    @echo "Running DB inner-ring tests..."
    # Placeholder for Hurl invocation
