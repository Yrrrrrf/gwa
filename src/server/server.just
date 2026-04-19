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
    cd proto && buf generate
    @echo "✓ gRPC stubs generated for Go"

[doc('Build all components')]
[group('Build')]
build: build-db build-engine build-grpc
    @echo "✓ Full server build complete"

# ── Dev ───────────────────────────────────────────────────────

[doc('Run the server in development mode')]
[group('Dev')]
run:
    #!/usr/bin/env bash
    # Finalized Phase 4 microkernel run recipe
    set -e

    # Load env from .env if present, else from .env.example
    if [ -f .env ]; then
      export $(grep -v '^#' .env | xargs)
    elif [ -f .env.example ]; then
      export $(grep -v '^#' .env.example | xargs)
    fi

    echo "🚀 Starting Microkernel Stack..."

    # Start DB detached
    cd db && podman-compose up -d
    cd ..

    # Poll DB health
    echo "⌛ Waiting for SurrealDB..."
    TIMEOUT=30
    while ! curl -s -f http://localhost:8000/health > /dev/null; do
      sleep 1
      let TIMEOUT-=1
      if [ $TIMEOUT -eq 0 ]; then
        echo "❌ DB health check timed out"
        exit 1
      fi
    done
    echo "🗄️ SurrealDB is ready"

    # Start engine in background
    echo "🦀 Starting Engine..."
    cd engine && cargo run -p gateway &
    ENGINE_PID=$!
    cd ..

    # Start RPC in background
    echo "🐹 Starting RPC Sidecar..."
    cd rpc && go run ./cmd/server &
    RPC_PID=$!
    cd ..

    # Trap for cleanup
    trap "echo '🛑 Shutting down...'; kill $ENGINE_PID $RPC_PID 2>/dev/null; cd db && podman-compose down; exit" INT TERM EXIT

    echo "✅ Stack is UP"
    wait

[doc('Tear down all services')]
[group('Dev')]
down:
    @echo "🛑 Tearing down stack..."
    -@cd db && podman-compose down
    -@pkill -f "cargo run -p gateway" || true
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
