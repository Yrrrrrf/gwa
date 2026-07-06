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
