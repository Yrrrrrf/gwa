set dotenv-load := true

[doc('Run project in development mode')]
[group('Dev')]
run:
    just -f src/server/server.just run
    just -f src/client/client.just run

[doc('Test the entire project')]
[group('Dev')]
test:
    just -f src/server/server.just test
    just -f src/client/client.just test
