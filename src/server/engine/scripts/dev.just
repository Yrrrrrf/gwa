[doc('Build Engine')]
[group('dev')]
build:
    cargo build -p gateway

[doc('Run Rust Engine')]
[group('dev')]
run:
    with-env {RUST_LOG: "debug"} { cargo run -p gateway }
