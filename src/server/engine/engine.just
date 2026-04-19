[doc('Format Engine code')]
[group('CI')]
fmt:
    cargo fmt --all

[doc('Lint Engine code')]
[group('CI')]
lint:
    cargo clippy --all-targets --all-features

[doc('Type-check Engine code')]
[group('CI')]
typecheck:
    cargo check --all-targets

[doc('Build Engine')]
[group('Build')]
build:
    cargo build -p gateway

[doc('Run Rust Engine')]
[group('Dev')]
run:
    RUST_LOG=debug cargo run -p gateway

[doc('Test Engine (Cargo)')]
[group('Test')]
test:
    cargo test --workspace
