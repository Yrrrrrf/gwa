CREATE account:development SET email = "dev@example.test", pass = crypto::argon2::generate("development-example-password");
CREATE item:development SET owner = account:development, title = "Development example";
