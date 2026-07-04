# Server stack components are started individually in development mode (e.g. `just server::db::run`, `just server::engine::run`, etc.).
[doc('Run development environment')]
[group('dev')]
run: client::run

[doc('Build all namespaces')]
[group('dev')]
build: client::build server::build cli::build
