[doc('Format all server components')]
[group('check')]
fmt: db::fmt engine::fmt rpc::fmt tests::fmt

[doc('Lint all server components')]
[group('check')]
lint: db::lint engine::lint rpc::lint tests::lint

[doc('Type-check all server components')]
[group('check')]
types: db::types engine::types rpc::types tests::types

# [doc('Audit all code namespaces')]
# [group('check')]
# audit: db::audit engine::audit rpc::audit tests::audit

[doc('Run all server quality gates')]
[group('check')]
check: fmt lint types
