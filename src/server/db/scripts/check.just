# No SurrealQL formatter is adopted; this placeholder keeps the verb surface uniform.
[group('check')]
fmt:
    @echo "fmt: no SurrealQL formatter adopted; skipping"

# No SurrealQL linter is adopted; this placeholder keeps the verb surface uniform.
[group('check')]
lint:
    @echo "lint: no SurrealQL linter adopted; skipping"

# No SurrealQL typechecker exists; this placeholder keeps the verb surface uniform.
[group('check')]
types:
    @echo "types: no SurrealQL typechecker exists; skipping"

[doc('Run all code checks')]
[group('check')]
check: fmt lint types
