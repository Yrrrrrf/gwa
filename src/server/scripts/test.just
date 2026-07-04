# Live services (db, engine, rpc) must be running for integration tests. Run specific suites using `just server::tests::test`.
[doc('Run all server tests')]
[group('test')]
test: db::test engine::test rpc::test tests::test
