[doc('Format Engine code')]
[group('check')]
fmt:
    cargo fmt --all

[doc('Lint Engine code')]
[group('check')]
lint:
    cargo clippy --all-targets --all-features

[doc('Type-check Engine code')]
[group('check')]
types:
    cargo check --all-targets

[doc('Run all code checks')]
[group('check')]
check: fmt lint types
