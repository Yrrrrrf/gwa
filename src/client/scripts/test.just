# test.just — test runner and coverage

[doc('Run dynamic categorized test dashboard across SDK and Apps (pass -v for detailed logs)')]
[group('test')]
test *flags:
    {{ CLI }} test {{ flags }}

[doc('Test coverage')]
[group('test')]
coverage *flags:
    {{ CLI }} coverage {{ flags }}
