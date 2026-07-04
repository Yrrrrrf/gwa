# Deploy is blocked on the root compose consolidation. See docs/todo.md.
[doc('Deploy application stack')]
[group('deploy')]
deploy:
    error make {msg: "Root deploy is currently blocked on the root docker-compose.yml rewrite. Please see docs/todo.md for details."}
