set shell := ["nu", "-c"]

[default]
list:
    @just --list --unsorted

[doc('Format RPC code')]
[group('check')]
fmt:
    go fmt ./...

[doc('Lint RPC code')]
[group('check')]
lint:
    go vet ./...

[doc('Type-check RPC code')]
[group('check')]
types:
    go build ./...

[doc('Run all code checks')]
[group('check')]
check: fmt lint types

[doc('Generate stubs from protobuf (Go + TS)')]
[group('dev')]
generate:
    cd ../proto; with-env {PATH: ($env.PATH | prepend "../tests/node_modules/.bin")} { buf generate }

[doc('Build RPC')]
[group('dev')]
build: generate
    go build -o target/rpc ./cmd/server

[doc('Run Go RPC sidecar')]
[group('dev')]
run:
    go run ./cmd/server

# Generated connect stubs are excluded because they carry no tests worth compiling repeatedly.
[doc('Test RPC (Go unit tests)')]
[group('test')]
test:
    ^go test ...(go list ./... | lines | where {|l| not ($l | str contains "templatev1connect")}) -count=1

[doc('Test RPC (live grpcurl smoke)')]
[group('test')]
test-smoke:
    nu tests/grpcurl.nu

# The old body called bare `just test`, which resolved to the root justfile via upward discovery because rpc/ has no justfile; dependencies make this static and correct.
[doc('Test RPC (unit + smoke)')]
[group('test')]
test-all: test test-smoke
