# deploy.just — ci and verification

[doc('Run quality gate (check + test)')]
[group('ci')]
ci *flags:
    {{ CLI }} ci {{ flags }}

[doc('Build and verify CLI distribution')]
[group('deploy')]
build *flags:
    {{ CLI }} build {{ flags }}
