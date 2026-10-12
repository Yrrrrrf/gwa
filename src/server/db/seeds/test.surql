CREATE account:fixture SET email = "fixture@example.test", pass = crypto::argon2::generate("test-example-password");
CREATE item:fixture SET owner = account:fixture, title = "Test example";
