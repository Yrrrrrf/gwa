# Server deploy requires consolidating and rewriting the docker-compose configuration.
[doc('Deploy server stack')]
[group('deploy')]
deploy:
    error make {msg: "Server deploy is currently blocked on the docker-compose.yml rewrite. See docs/todo.md for details."}
