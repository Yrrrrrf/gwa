# test.just — test runner and coverage

[doc('Run dynamic categorized test dashboard across SDK and Apps (pass -v for logs, -p for parallel)')]
[group('test')]
[positional-arguments]
test *flags:
    {{ CLI }} test {{ flags }}

[doc('Test coverage via Vitest')]
[group('test')]
[positional-arguments]
coverage *flags:
    ^deno run -A npm:vitest run --coverage --config ./config/vitest.config.ts {{ flags }}
