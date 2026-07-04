# Note: running db/engine/rpc sequentially in development mode is blocking; run individual services if preferred.
[doc('Run all server components in development mode')]
[group('dev')]
run: db::run engine::run rpc::run

[doc('Build all server components')]
[group('dev')]
build: db::build engine::build rpc::build
