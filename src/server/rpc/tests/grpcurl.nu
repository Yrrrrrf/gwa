#!/usr/bin/env nu

# Resolve to the rpc directory
cd ($env.FILE_PWD | path join "..")

print "🐹 Running RPC Live Smoke Tests..."

# Load variables if present
let env_file = ($env.FILE_PWD | path join "../.env")
if ($env_file | path exists) {
    let env_vars = (open --raw $env_file 
        | lines 
        | filter {|line| not ($line | str starts-with "#") and ($line | str contains "=")}
        | parse "{key}={val}"
        | each {|row| {key: ($row.key | str trim), val: ($row.val | str trim -c '"' | str trim -c "'")} }
        | reduce -f {} {|it, acc| $acc | insert $it.key $it.val}
    )
    load-env $env_vars
}

let port = ($env.PORT_RPC? | default "4000")
let jwt_secret = ($env.JWT_SECRET? | default "super-secret-template-key-change-me-in-production")

print "1. Minting token..."
let token = (with-env { JWT_SECRET: $jwt_secret } {
    go run ./tests/bin/mint-token
} | str trim)

if ($token | is-empty) {
    error make {msg: "Failed to mint token"}
}
print "   Token minted"

print "2. Health check (no auth)..."
let health = (grpcurl -plaintext $"localhost:($port)" grpc.health.v1.Health/Check)
if not ($health | str contains "SERVING") {
    error make {msg: $"Health check failed: ($health)"}
}
print "   Passed"

print "3. NotifierService/Dispatch (authenticated)..."
grpcurl -plaintext -H $"authorization: Bearer ($token)" -d '{"order_id":"smoke-1","channel":"email","recipient":"smoke@test.com","subject":"Smoke","body":"Test"}' $"localhost:($port)" template.v1.NotifierService/Dispatch
print "   Passed"

print "4. DocumentService/Generate (authenticated)..."
grpcurl -plaintext -H $"authorization: Bearer ($token)" -d '{"template_id":"commerce/invoice","format":"pdf"}' $"localhost:($port)" template.v1.DocumentService/Generate
print "   Passed"

print "5. Unauthenticated call rejection..."
let reject_call = (do {
    grpcurl -plaintext -d '{}' $"localhost:($port)" template.v1.NotifierService/Dispatch
} | complete)

if not ($reject_call.stderr | str contains "Unauthenticated") {
    error make {msg: $"Expected Unauthenticated error, got: ($reject_call.stderr)"}
}
print "   Passed"

print "✅ All RPC smoke tests passed!"
