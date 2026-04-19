# ── Xibalbá · Server ──────────────────────────────────────────
# ── CI ────────────────────────────────────────────────────────

[doc('Format Server code')]
[group('CI')]
fmt:
    cd engine && cargo fmt --all
    @echo "✓ Server formatted successfully"

[doc('Lint Server code')]
[group('CI')]
lint:
    cd engine && cargo clippy --all-targets --all-features
    @echo "✓ Server lint passed"

[doc('Type-check Server workspace')]
[group('CI')]
typecheck:
    cd engine && cargo check --all-targets
    @echo "✓ Type-checking Server workspace passed"

[doc('Full server quality gate')]
[group('CI')]
quality: fmt lint typecheck
    @echo "✓ Server quality checks passed"

# ── Build ─────────────────────────────────────────────────────

[doc('Build DB image')]
[group('Build')]
[working-directory("db")]
build-db:
    podman-compose down -v
    podman-compose build --no-cache
    @echo "✓ DB image built successfully"

[doc('Build Engine')]
[group('Build')]
[working-directory("engine")]
build-engine:
    cargo build -p gateway
    @echo "✓ Engine built successfully"

[doc('Generate Go code from protobuf')]
[group('Build')]
[working-directory("proto")]
build-grpc:
    (buf generate || nix shell nixpkgs#buf --command buf generate)
    @echo "✓ gRPC stubs generated for Go"

[doc('Build all components')]
[group('Build')]
build: build-db build-engine build-grpc
    @echo "✓ Full server build complete"

# ── Dev ───────────────────────────────────────────────────────

[doc('Run SurrealDB (Podman)')]
[group('Dev')]
[working-directory("db")]
run-db: build-db
    podman-compose up
    @echo "✓ DB running in development mode"

[doc('Run Rust Engine')]
[group('Dev')]
[working-directory("engine")]
run-engine: build-engine
    RUST_LOG=debug cargo run -p gateway
    @echo "✓ Engine running in development mode"

[doc('Run Go RPC sidecar')]
[group('Dev')]
[working-directory("rpc")]
run-rpc: build-grpc
    go run ./cmd/server
    @echo "✓ RPC sidecar running in development mode"

[doc('Run the full stack in development mode')]
[group('Dev')]
run: run-db run-engine run-rpc
    @echo "✓ Full server running in development mode"

[doc('Test the server')]
[group('Dev')]
test:
    @echo "Running Deno unified test suite..."
    @cd tests && deno task test
