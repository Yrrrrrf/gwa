mod db "db/db.just"
mod engine "engine/engine.just"
mod rpc "rpc/rpc.just"
mod tests "tests/tests.just"

[doc('Format Server code')]
[group('CI')]
fmt:
    just -f db/db.just fmt
    just -f engine/engine.just fmt
    just -f rpc/rpc.just fmt
    just -f tests/tests.just fmt

[doc('Lint Server code')]
[group('CI')]
lint:
    just -f db/db.just lint
    just -f engine/engine.just lint
    just -f rpc/rpc.just lint
    just -f tests/tests.just lint

[doc('Type-check Server workspace')]
[group('CI')]
typecheck:
    just -f db/db.just typecheck
    just -f engine/engine.just typecheck
    just -f rpc/rpc.just typecheck
    just -f tests/tests.just typecheck

[doc('Full server quality gate')]
[group('CI')]
quality: fmt lint typecheck

[doc('Build all components')]
[group('Build')]
build:
    just -f db/db.just build
    just -f engine/engine.just build
    just -f rpc/rpc.just build

[doc('Run the full stack in development mode')]
[group('Dev')]
run:
    just -f db/db.just run
    just -f engine/engine.just run
    just -f rpc/rpc.just run

[doc('Test the server')]
[group('Dev')]
[working-directory("tests")]
test:
    just -f ../db/db.just test
    just -f ../engine/engine.just test
    just -f ../rpc/rpc.just test
    # * Run specialized tests from the tests suite
    -deno run -A npm:vite-plus/vp test
    # * or run them individually:
    # deno run -A npm:vite-plus/vp test integration/db unit/db
    # deno run -A npm:vite-plus/vp test integration/engine
    # deno run -A npm:vite-plus/vp test integration/rpc
    # deno run -A npm:vite-plus/vp test e2e
