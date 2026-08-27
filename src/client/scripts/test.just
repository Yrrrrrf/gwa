[doc('Run dynamic categorized test dashboard across SDK and Apps (pass -v for detailed logs, -b for timing)')]
[group('test')]
[positional-arguments]
[script]
test *args:
    use {{ HARNESS_NU }} *

    def --wrapped main [...raw_args: string] {
        let is_v = ($raw_args | any { $in in ["-v", "--verbose"] })
        let is_b = ($raw_args | any { $in in ["-b", "--bench", "-d", "--duration"] })
        run-tests-dashboard $is_v $is_b
    }

[doc('Test coverage')]
[group('test')]
coverage:
    ^deno run -A npm:vitest run --coverage --config ./config/vitest.config.ts
