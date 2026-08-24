[doc('Run full CI pipeline (check + test)')]
[group('deploy')]
ci: check test

[doc('Deploy application stack')]
[group('deploy')]
deploy:
    error make {msg: "Root deploy is currently blocked on the root docker-compose.yml rewrite. Please see docs/todo.md for details."}

[doc('Publish full release')]
[group('deploy')]
publish: ci deploy
