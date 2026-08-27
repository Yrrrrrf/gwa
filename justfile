set shell := ["nu", "-c"]
set dotenv-load

mod client 'src/client/justfile'
mod server 'src/server/server.just'
mod cli 'src/cli/cli.just'

import 'scripts/_shared.just'
import 'scripts/dev.just'
import 'scripts/check.just'
import 'scripts/test.just'
import 'scripts/deploy.just'
