# check.just — fix · writes & type/quality gates

[doc('Format workspace')]
[group('check')]
fmt *flags:
    {{ CLI }} fmt {{ flags }}

[doc('Lint workspace')]
[group('check')]
lint *flags:
    {{ CLI }} lint {{ flags }}

[doc('Type-check workspace (SDK modules + SvelteKit apps) (pass -v for detailed logs)')]
[group('check')]
types *flags:
    {{ CLI }} types {{ flags }}

[doc('Audit all code namespaces')]
[group('check')]
audit *flags:
    {{ CLI }} audit {{ flags }}

[doc('Check code health')]
[group('check')]
health *flags:
    {{ CLI }} health {{ flags }}

[doc('Run all check quality gates (pass -v for detailed logs, -b for timing)')]
[group('check')]
check *flags:
    {{ CLI }} check {{ flags }}
