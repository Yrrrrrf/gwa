# check.just — fix · writes & type/quality gates

[doc('Format workspace')]
[group('check')]
fmt:
    ^biome format --config-path=config/biome.json --write .

[doc('Lint workspace')]
[group('check')]
lint:
    ^deno lint .
    -^biome lint --config-path=config/biome.json .

[doc('Type-check workspace (SDK modules + SvelteKit apps) (pass -v for detailed logs)')]
[group('check')]
[positional-arguments]
[script]
types *args:
    use {{ HARNESS_NU }} *

    def --wrapped main [...raw_args: string] {
        run-types-dashboard ($raw_args | any { $in in ["-v" "--verbose"] })
    }

[doc('Audit all code namespaces')]
[group('check')]
audit:
    ^deno run -A npm:fallow -c config/fallowrc.json

[doc('Check code health')]
[group('check')]
health:
    ^deno run -A npm:fallow health --score -c config/fallowrc.json

[doc('Run all check quality gates (pass -v for detailed logs)')]
[group('check')]
[positional-arguments]
check *args: fmt lint (types args)
