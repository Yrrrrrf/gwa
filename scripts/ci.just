[doc('Format all code')]
[group('CI')]
fmt:
    just -f src/client/client.just fmt
    just -f src/server/server.just fmt

[doc('Lint all code')]
[group('CI')]
lint:
    just -f src/client/client.just lint
    just -f src/server/server.just lint

[doc('Type-check all code')]
[group('CI')]
typecheck:
    just -f src/client/client.just typecheck
    just -f src/server/server.just typecheck

[doc('Full quality gate — fmt + lint + typecheck')]
[group('CI')]
quality: fmt lint typecheck
    @echo "✓ All quality checks passed"

# todo: Add the imports to make it work the build-all and test-all tasks
# [group('CI')]
# [doc('Full CI pipeline')]
# ci: quality build-all test-all
#     @echo "CI passed ✓"
