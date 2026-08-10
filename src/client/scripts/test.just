[doc('Run one workspace member through vite-plus (shim in, test, shim out)')]
[group('test')]
test-project dir:
    just with-shim . "{{ justfile_directory() / "scripts/shims/package.json" }}" deno run -A npm:vite-plus/vp test {{ dir }}

[doc('Run the full test suite: core via deno test, then each vp workspace')]
[group('test')]
test:
    deno test --allow-all src/packages/core/src/
    just test-project src/
