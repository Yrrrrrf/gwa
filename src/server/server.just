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
build-db:
    cd db && podman-compose build --no-cache
    @echo "✓ DB image built successfully"

[doc('Build Engine')]
[group('Build')]
build-engine:
    cd engine && cargo build -p gateway
    @echo "✓ Engine built successfully"

[doc('Generate Go code from protobuf')]
[group('Build')]
build-grpc:
    cd proto && (buf generate || nix shell nixpkgs#buf --command buf generate)
    @echo "✓ gRPC stubs generated for Go"

[doc('Build all components')]
[group('Build')]
build: build-db build-engine build-grpc
    @echo "✓ Full server build complete"

# ── Dev ───────────────────────────────────────────────────────

[doc('Run SurrealDB (Podman)')]
[group('Dev')]
run-db:
    cd db && podman-compose up

[doc('Run Rust Engine')]
[group('Dev')]
run-engine:
    #!/usr/bin/env bash
    if [ -f .env ]; then export $(grep -v '^#' .env | xargs); elif [ -f .env.example ]; then export $(grep -v '^#' .env.example | xargs); fi
    cd engine && RUST_LOG=debug cargo run -p gateway

[doc('Run Go RPC sidecar')]
[group('Dev')]
run-rpc:
    #!/usr/bin/env bash
    if [ -f .env ]; then export $(grep -v '^#' .env | xargs); elif [ -f .env.example ]; then export $(grep -v '^#' .env.example | xargs); fi
    cd rpc && go run ./cmd/server

[doc('Run the full stack in development mode')]
[group('Dev')]
run: run-db run-engine run-rpc
    # todo: add health check
    @echo "✓ Full stack running"

[doc('Tear down all services')]
[group('Dev')]
down:
    @echo "🛑 Tearing down stack..."
    -@cd db && podman-compose down
    -@pkill -f "target/debug/gateway" || true
    -@pkill -f "go run ./cmd/server" || true
    @echo "✓ Stack down"

[doc('Check service health')]
[group('Dev')]
status:
    @cd tests && deno run -A preflight.ts

[doc('Test the server')]
[group('Dev')]
test:
    @echo "Running Deno unified test suite..."
    @cd tests && deno task test

# ── Deploy ────────────────────────────────────────────────────

[doc('Deploy to Cloud Run (sketch)')]
[group('Deploy')]
deploy:
    @echo "Deploy not configured for template. See README.md for deployment strategy."
