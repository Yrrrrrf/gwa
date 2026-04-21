# RPC Inner Ring — Go Unit & Live Smoke

This directory contains the live smoke tests for the Go RPC sidecar.

**Two flavors of inner ring testing:**

1. **Unit tests (`go test`)**: Fast, hermetic tests that exercise pure logic
   (e.g., JWT validation, interceptor logic) without starting a gRPC server. See
   `internal/**/*_test.go`.
2. **Live smoke (`grpcurl.sh`)**: Exercises a running sidecar process to verify
   routing, interceptors, and response formats over the wire. Needs the service
   to be running.

## Running

```bash
# Run unit tests only
just rpc::test

# Run live smoke (requires `just rpc::run` in another terminal)
just rpc::test-smoke

# Run both unit and smoke
just rpc::test-all
```

## Structure

- `grpcurl.sh`: The main Bash script invoking `grpcurl`.
- `bin/mint-token`: A Go tool to generate valid system tokens for testing,
  sharing the `JWT_SECRET` logic with the TS side.
