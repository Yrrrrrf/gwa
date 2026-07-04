# Server integration tests require live services. To test individual sub-suites, run `just server::tests::test`.
[doc('Run all test suites')]
[group('test')]
test:
    client::test
    server::test
    cli::test
