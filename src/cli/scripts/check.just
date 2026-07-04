# Future body: cargo fmt --all
[doc('Format CLI code')]
[group('check')]
fmt:
    @echo "fmt: cli crate not implemented; skipping"

# Future body: cargo clippy --all-targets --all-features
[doc('Lint CLI code')]
[group('check')]
lint:
    @echo "lint: cli crate not implemented; skipping"

# Future body: cargo check --all-targets
[doc('Type-check CLI code')]
[group('check')]
types:
    @echo "types: cli crate not implemented; skipping"

[doc('Run all CLI quality gates')]
[group('check')]
check: fmt lint types
