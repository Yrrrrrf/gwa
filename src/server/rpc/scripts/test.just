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
