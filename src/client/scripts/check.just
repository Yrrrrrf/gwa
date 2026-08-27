# check.just — fix · writes & type/quality gates

[doc('Format workspace')]
[group('check')]
fmt:
    # ^deno fmt .
    ^biome format --config-path=config/biome.json --write .

[doc('Lint workspace')]
[group('check')]
lint:
    # ^deno lint .
    -^biome lint --config-path=config/biome.json .

[doc('Type-check workspace (SDK modules + SvelteKit apps) (pass -v for detailed logs)')]
[group('check')]
[positional-arguments]
[script]
types *args:
    use {{ HARNESS_NU }} [parse-cli-flags run-types-dashboard]

    def --wrapped main [...raw: string]: nothing -> nothing {
        let f = (parse-cli-flags $raw)
        run-types-dashboard $f.v
    }

[doc('Audit all code namespaces')]
[group('check')]
audit:
    ^deno run -A npm:fallow -c config/fallowrc.json

[doc('Check code health')]
[group('check')]
health:
    ^deno run -A npm:fallow health --score -c config/fallowrc.json

[doc('Run all check quality gates (pass -v for detailed logs, -b for timing)')]
[group('check')]
[positional-arguments]
check *args: fmt lint (types args)
