# Zero client test files exist today; the verb passes vacuously so root CI can exercise it.
[doc('Run client test suite')]
[group('test')]
test:
    deno test -A
