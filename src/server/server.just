# GWA · Server

set shell := ["nu", "-c"]
set dotenv-load

mod db "db/db.just"
mod engine "engine/engine.just"
mod rpc "rpc/rpc.just"
mod tests "tests/tests.just"

import 'scripts/_shared.just'
import 'scripts/dev.just'
import 'scripts/check.just'
import 'scripts/test.just'
import 'scripts/deploy.just'
