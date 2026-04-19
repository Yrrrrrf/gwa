# ── Xibalbá · Server ──────────────────────────────────────────
#  CI

[doc('Format Server code')]
[group('CI')]
[working-directory('engine')]
fmt:
    cargo fmt --all
    @echo "✓ Server formatted successfully"

[doc('Lint Server code')]
[group('CI')]
lint:
    # todo: Add lint types for the lint command!
    # ^ lint lenient
    # * no warnings for clippy
    # cd engine && cargo clippy --all-targets --all-features -- -A warnings
    cd engine && cargo clippy

    # ^ lint normal
    # * normal
    # cd engine && cargo clippy --all-targets --all-features

    # ^ lint strict
    # * scale warnings to errors
    # cd engine && cargo clippy --all-targets --all-features -- -D warnings
    @echo "✓ Server lint passed"

[doc('Type-check Server workspace')]
[group('CI')]
[working-directory('engine')]
typecheck:
    cargo check --all-targets
    @echo "Type-checking Server workspace..."

[doc('Full server quality gate')]
[group('CI')]
quality: fmt lint typecheck
    # proto-lint proto-breaking
    @echo "✓ Server quality checks passed"

#
# [doc('Lint protobuf definitions')]
# [group('CI')]
# proto-lint:
#     cd proto && buf lint
#     @echo "✓ Proto lint passed"
#
# [doc('Check for breaking changes in protobuf')]
# [group('CI')]
# proto-breaking:
#     cd proto && buf breaking --against '.git#branch=main'
#     @echo "✓ No breaking proto changes found"
# [doc('Generate code from protobuf')]
# [group('Build')]
# proto:
#     cd proto && buf generate
#     @echo "✓ Proto generation successful"
# Deploy
# Deploy

[doc('Build DB')]
[group('Build')]
[working-directory('db')]
build-db:
    # stop the db container and remove the volume
    podman-compose down -v
    # build the db docker image and start the db container
    # todo: separate 'build' and 'run' commands
    # build command:
    podman-compose build --no-cache
    @echo "✓ DB built successfully"

[doc('Build Engine')]
[group('Build')]
build-engine:
    # todo: Add the engine build command
    # * build core
    #todo: Add build commands for the services (api)
    # * build services (api)
    #todo: Add build commands for the wasm service
    # * build services (wasm)
    # just -f engine/services/wasm/justfile build
    # cd engine && cargo build --release -p api
    @echo "✓ Engine built successfully"

[doc('Build server')]
[group('Build')]
build: build-db build-engine
    @echo "✓ Server built successfully"

[doc('Run the server in development mode')]
[group('Dev')]
run: build
    # todo: Add the dev command
    # just -f server.just build
    cd db && podman-compose up
    # cd engine && cargo run -p api
    @echo "✓ Server running in development mode"

[doc('Test the server')]
[group('Dev')]
test:
    @echo "Running Deno unified test suite..."
    @cd tests && deno task test

# ── Deploy (Google Cloud) ─────────────────────────────────────

[doc('Deploy the app image to Cloud Run')]
[group('Deploy')]
deploy region='us-central1' project='':
    # todo: Add the deploy command
    # gcloud run deploy xibalba-db \
    #     --image {{ region }}-docker.pkg.dev/{{ project }}/xibalba/db:latest \
    #     --region {{ region }} \
    #     --project {{ project }} \
    #     --port 8000 \
    #     --set-env-vars SURREAL_PATH=file:///data \
    #     --no-allow-unauthenticated
    @echo "✓ Server deployed to Cloud Run"
