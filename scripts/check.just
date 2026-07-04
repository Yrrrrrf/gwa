[doc('Format all code namespaces')]
[group('check')]
fmt: client::fmt server::fmt cli::fmt

[doc('Lint all code namespaces')]
[group('check')]
lint: client::lint server::lint cli::lint

[doc('Type-check all code namespaces')]
[group('check')]
types: client::types server::types cli::types

[doc('Run all quality gates')]
[group('check')]
check: fmt lint types
