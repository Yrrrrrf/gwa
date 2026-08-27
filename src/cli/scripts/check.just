# check.just — formatting, linting, and type checking quality gates

[doc('Format CLI engine')]
[group('check')]
fmt *flags:
    {{ CLI }} fmt {{ flags }}

[doc('Lint CLI engine')]
[group('check')]
lint *flags:
    {{ CLI }} lint {{ flags }}

[doc('Type-check CLI engine modules')]
[group('check')]
types *flags:
    {{ CLI }} types {{ flags }}

[doc('Run all check quality gates')]
[group('check')]
check *flags:
    {{ CLI }} check {{ flags }}
