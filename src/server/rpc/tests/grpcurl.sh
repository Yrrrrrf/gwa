#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "🐹 Running RPC Live Smoke Tests..."

# Check if grpcurl is available
if ! command -v grpcurl &> /dev/null; then
    echo "❌ Error: grpcurl is not installed or not in PATH."
    exit 1
fi

# Load variables
if [ -f ../.env ]; then
    export $(grep -v '^#' ../.env | xargs)
fi

PORT=${PORT_RPC:-4000}
JWT_SECRET=${JWT_SECRET:-super-secret-template-key-change-me-in-production}

# Ensure the server is up
if ! curl -sf http://localhost:$PORT > /dev/null 2>&1 && ! nc -z localhost $PORT > /dev/null 2>&1; then
    # We can't really cleanly check gRPC HTTP/2 port with curl sometimes, so we'll just proceed and let the health test fail
    true
fi

echo "1. Minting token..."
TOKEN=$(export JWT_SECRET=$JWT_SECRET; go run ./tests/bin/mint-token)
if [ -z "$TOKEN" ]; then
    echo "❌ Failed to mint token"
    exit 1
fi
echo "   Token minted"

echo "2. Health check (no auth)..."
grpcurl -plaintext localhost:$PORT grpc.health.v1.Health/Check | grep -q "SERVING"
echo "   Passed"

echo "3. NotifierService/Dispatch (authenticated)..."
grpcurl -plaintext \
  -H "authorization: Bearer $TOKEN" \
  -d '{"order_id":"smoke-1","channel":"email","recipient":"smoke@test.com","subject":"Smoke","body":"Test"}' \
  localhost:$PORT template.v1.NotifierService/Dispatch > /dev/null
echo "   Passed"

echo "4. DocumentService/Generate (authenticated)..."
grpcurl -plaintext \
  -H "authorization: Bearer $TOKEN" \
  -d '{"template_id":"commerce/invoice","format":"pdf"}' \
  localhost:$PORT template.v1.DocumentService/Generate > /dev/null
echo "   Passed"

echo "5. Unauthenticated call rejection..."
set +e
ERROR_OUTPUT=$(grpcurl -plaintext -d '{}' localhost:$PORT template.v1.NotifierService/Dispatch 2>&1)
set -e
if ! echo "$ERROR_OUTPUT" | grep -q "Unauthenticated"; then
    echo "❌ Expected Unauthenticated error, got: $ERROR_OUTPUT"
    exit 1
fi
echo "   Passed"

echo "✅ All RPC smoke tests passed!"
