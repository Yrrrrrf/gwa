# Rebuild, reset disposable development data, start and follow logs.
[script]
run:
    ^just _images dev
    ^just _reset dev
    ^just db-init dev
    ^just _up dev engine
    ^just _ready dev engine
    ^just _exec banner 'GWA ready: HTTP + JSON-RPC + WebSocket + gRPC'
    let project = ($env.GWA_PROJECT? | default (open config/profiles/dev.toml).profile.project)
    let vars = (open $".state/($project).json").env
    print $"HTTP ($vars.GWA_HTTP_URL) | gRPC ($vars.GWA_GRPC_ADDR) | DB ($vars.GWA_DB_URL)"
    ^just logs

# Stop containers while retaining both named volumes.
stop:
    just _down dev

[script]
logs unit="all":
    def main [unit: string] {
        if $unit == all { ^just _compose dev logs -f } else if $unit in [db engine] { ^just _compose dev logs -f $unit } else { error make {msg: "unit must be all, db or engine"} }
    }
status:
    just _compose dev ps

# Remove generated build artifacts only.
[script]
clean:
    ^cargo clean --manifest-path engine/Cargo.toml
