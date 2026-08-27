[doc('Run dynamic categorized test dashboard across SDK and Apps (pass -v for detailed logs, -b for timing)')]
[group('test')]
[positional-arguments]
[script]
test *args:
    use {{ HARNESS_NU }} [parse-cli-flags run-tests-dashboard]

    def --wrapped main [...raw: string] {
        let f = (parse-cli-flags $raw)
        run-tests-dashboard $f.v $f.b
    }

[doc('Test coverage')]
[group('test')]
coverage:
    ^deno run -A npm:vitest run --coverage --config ./config/vitest.config.ts
