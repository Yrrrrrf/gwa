[doc('Format all server components')]
[group('check')]
fmt: db::fmt engine::fmt rpc::fmt tests::fmt

[doc('Lint all server components')]
[group('check')]
lint: db::lint engine::lint rpc::lint tests::lint

[doc('Type-check all server components')]
[group('check')]
types: db::types engine::types rpc::types tests::types

[doc('Run all server quality gates')]
[group('check')]
check: fmt lint types
