set shell := ["bash", "-cu"]

mod client 'src/client/client.just'
# mod server 'src/server/server.just'
mod server 'src/server/justfile'

import 'scripts/dev.just'
import 'scripts/ci.just'
import 'scripts/deploy.just'

# todo: Check if this is really useful or a redundancy :c
# list:
#     @just --list
#     @just --list server
#     @just --list client
