[doc('Format RPC code')]
[group('CI')]
fmt:
    go fmt ./...

[doc('Lint RPC code')]
[group('CI')]
lint:
    go vet ./...

[doc('Type-check RPC code')]
[group('CI')]
typecheck:
    go build ./...

[doc('Generate stubs from protobuf (Go + TS)')]
[group('Build')]
generate:
    cd ../proto && PATH="../tests/node_modules/.bin:$PATH" buf generate

[doc('Build RPC')]
[group('Build')]
build: generate
    go build -o target/rpc ./cmd/server

[doc('Run Go RPC sidecar')]
[group('Dev')]
run:
    go run ./cmd/server

[doc('Test RPC (Go)')]
[group('Test')]
test:
    go test ./...
