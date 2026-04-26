[doc('Format test suite')]
[group('CI')]
fmt:
    deno fmt .

[doc('Lint test suite')]
[group('CI')]
lint:
    deno lint .

[doc('Type-check test suite')]
[group('CI')]
typecheck:
    deno check .
    # deno check . --sloppy-imports

# Test integration

[doc('Tri-path validation — all inner + outer rings with summary')]
[group('Test')]
test-triangle:
    #!/usr/bin/env bash
    declare -A results

    run_segment() {
        local tag=$1; shift
        "$@" 2>&1 && results[$tag]="✓" || results[$tag]="✗"
    }

    run_segment "HURL"       just -f ../db/db.just test
    run_segment "SDK"        just -f tests.just test-db
    run_segment "CARGO"      just -f ../engine/engine.just test
    run_segment "GQL"        just -f tests.just test-engine
    run_segment "GO"         just -f ../rpc/rpc.just test
    run_segment "GRPCURL"    just -f ../rpc/rpc.just test-smoke
    run_segment "CONNECT-TS" just -f tests.just test-rpc
    run_segment "E2E"        just -f tests.just test-e2e

    echo ""
    echo "╔══════════════════════════════════════╗"
    echo "║     Tri-Path Validation Summary      ║"
    echo "╠══════════════════════════════════════╣"
    for tag in HURL SDK CARGO GQL GO GRPCURL CONNECT-TS E2E; do
        printf "║  [%-11s]  %s                   ║\n" "$tag" "${results[$tag]:-?}"
    done
    echo "╚══════════════════════════════════════╝"

    for v in "${results[@]}"; do [[ "$v" == "✗" ]] && exit 1; done
    exit 0
