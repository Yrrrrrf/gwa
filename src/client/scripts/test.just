# test.just — prove · dynamic categorized test suite

[doc('Run workspace tests via vitest')]
[group('test')]
test-vp:
    ^deno run -A npm:vitest run --config ./config/vitest.config.ts

[doc('Run dynamic categorized test dashboard across SDK and Apps (pass -v for detailed logs)')]
[group('test')]
[positional-arguments]
[script]
test *args:
    use {{ HARNESS_NU }} *

    def --wrapped main [...raw_args: string] {
        run-tests-dashboard ($raw_args | any { $in in ["-v" "--verbose"] })
    }

[doc('Test coverage')]
[group('test')]
coverage:
    ^deno run -A npm:vitest run --coverage --config ./config/vitest.config.ts
