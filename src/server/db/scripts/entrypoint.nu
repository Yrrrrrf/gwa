#!/usr/bin/env nu

def poll-and-seed [
    port: int
    user: string
    pass: string
] {
    let endpoint = $"http://127.0.0.1:($port)/sql"
    
    # Retry loop to wait for SurrealDB to accept connections
    var ready = false
    for i in 1..10 {
        try {
            let query = "RETURN true;"
            let response = (
                http post --user $user --password $pass --headers {Accept: "application/json"} $endpoint $query
            )
            if ($response | get 0 | get status) == "OK" {
                $ready = true
                break
            }
        }
        sleep 2sec
    }
    
    if $ready {
        print "SurrealDB is ready. Starting database initialization..."
        nu /scripts/init-db.nu
    } else {
        print "Timeout waiting for SurrealDB to start. Skipping seeding."
    }
}

def main [] {
    let log_level = ($env.SURREAL_LOG? | default "info")
    let user = ($env.SURREAL_USER? | default "root")
    let pass = ($env.SURREAL_PASS? | default "root")
    let port = ($env.SURREAL_PORT? | default "8000" | into int)
    let path = ($env.SURREAL_PATH? | default "memory")
    let seed_on_start = ($env.SEED_ON_START? | default "true" | into bool)
    
    print "Starting SurrealDB..."
    
    # If seeding is enabled, spawn the polling and seeding routine in the background
    if $seed_on_start {
        print "Waiting for SurrealDB to accept connections..."
        spawn {
            # Give SurrealDB a brief moment to bind before starting the check
            sleep 1sec
            poll-and-seed $port $user $pass
        }
    }
    
    # Start SurrealDB in the foreground
    surreal start --log $log_level --user $user --pass $pass --bind $"0.0.0.0:($port)" $path
}
