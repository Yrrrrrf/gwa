set shell := ["nu", "-c"]

[default]
list:
    @just --list --unsorted

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

[doc('Build Engine')]
[group('dev')]
build:
    cargo build -p gateway

[doc('Run Rust Engine')]
[group('dev')]
run:
    with-env {RUST_LOG: "debug"} { cargo run -p gateway }

[doc('Test Engine (Cargo)')]
[group('test')]
test:
    cargo test --workspace
