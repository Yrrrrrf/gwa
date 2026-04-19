#!/usr/bin/env bash

# GWA · Stack Orchestrator
# Starts DB (container), Engine (native), and RPC (native).

# Load .env if exists, otherwise .env.example
if [ -f .env ]; then
  source .env
else
  source .env.example
fi

# Cleanup function
cleanup() {
  echo ""
  echo "🛑 Tearing down stack..."
  [ -n "$ENGINE_PID" ] && kill $ENGINE_PID 2>/dev/null
  [ -n "$RPC_PID" ] && kill $RPC_PID 2>/dev/null
  cd db && podman-compose down
  echo "✅ Stack stopped."
  exit 0
}

# Trap signals
trap cleanup INT TERM EXIT

echo "🚀 Starting GWA Stack..."

# 1. Start DB
echo "🗄️  Starting Database..."
cd db && podman-compose up -d
cd ..

# 2. Wait for DB health
echo -n "⏳ Waiting for DB health..."
MAX_RETRIES=30
COUNT=0
until $(curl --output /dev/null --silent --head --fail http://localhost:8000/health); do
    printf '.'
    sleep 1
    COUNT=$((COUNT+1))
    if [ $COUNT -eq $MAX_RETRIES ]; then
        echo "❌ DB failed to start in time."
        exit 1
    fi
done
echo " [OK]"

# 3. Start Engine (Rust)
echo "🦀 Starting Rust Engine..."
cargo run --manifest-path engine/Cargo.toml -p gateway &
ENGINE_PID=$!

# 4. Start RPC (Go)
echo "🐹 Starting Go RPC..."
if [ -f bin/rpc-server ]; then
  ./bin/rpc-server &
else
  (cd rpc && go run cmd/server/main.go) &
fi
RPC_PID=$!

echo "✨ All services running. Press Ctrl+C to stop."
echo "   API: http://localhost:${PORT:-3000}"
echo "   RPC: http://localhost:${PORT_RPC:-4000}"
echo "   DB:  http://localhost:8000"

# Keep alive
wait
