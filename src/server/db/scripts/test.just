[doc('Run DB inner-ring tests (Hurl)')]
[group('test')]
test:
    hurl --test --variables-file tests/.env --user root:root (glob tests/*.hurl)

[doc('Run a single Hurl test file (debug)')]
[group('test')]
test-one FILE:
    hurl --very-verbose --variables-file tests/.env --user root:root tests/{{FILE}}

[doc('Generate Hurl HTML report')]
[group('test')]
test-report:
    mkdir -p tests/out/report
    hurl --test --variables-file tests/.env --user root:root --report-html tests/out/report (glob tests/*.hurl)
