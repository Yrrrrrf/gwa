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
