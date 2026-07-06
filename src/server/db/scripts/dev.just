[doc('Build DB image')]
[group('dev')]
build:
    podman-compose down -v
    podman-compose build --no-cache

[doc('Run SurrealDB (Podman)')]
[group('dev')]
run: build
    podman-compose up

[doc('Stop SurrealDB (Podman)')]
[group('dev')]
down:
    podman-compose down -v
