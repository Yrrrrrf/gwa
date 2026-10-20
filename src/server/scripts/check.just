fmt:
    cargo fmt --manifest-path engine/Cargo.toml
    deno fmt --config tests/deno.json tests scripts
    hurlfmt --in-place ...(glob 'tests/**/*.hurl')
fmt-check:
    cargo fmt --manifest-path engine/Cargo.toml --check
    deno fmt --check --config tests/deno.json tests scripts
    hurlfmt --check ...(glob 'tests/**/*.hurl')
lint:
    just _exec exec --title 'RUST LINT' -- cargo clippy --locked --manifest-path engine/Cargo.toml --all-targets -- -D warnings
    just _exec exec --title 'DENO LINT' -- deno lint --config tests/deno.json tests scripts
types:
    just _exec exec --title 'RUST TYPES' -- cargo check --locked --manifest-path engine/Cargo.toml --all-targets
    just _exec exec --title 'DENO TYPES' -- deno check --config tests/deno.json --frozen scripts/runtime.ts ...(glob 'tests/**/*_test.ts')
contracts:
    just _exec exec --title 'CONTRACTS' -- deno test --config tests/deno.json --frozen --allow-read --allow-write=.state --allow-run --allow-env --allow-net=127.0.0.1 tests/engine/shared tests/scripts
audit:
    just _exec exec --title 'CARGO AUDIT' -- cargo audit --file engine/Cargo.lock
    just _exec exec --title 'DENO AUDIT' --cwd tests -- deno audit --frozen
check: fmt-check lint types contracts audit
# Tests finish before checks; build follows CI without recursive test/build dependencies.
ci: test-unit test check
build: ci
    @print "Validated images are ready (built once by the consumer suite)."
