# Foreground server-only session: one DB pod, one Rust engine pod.
run:
    deno run --config tests/deno.json --frozen --allow-read --allow-write=.state --allow-env --allow-run scripts/runtime.ts run dev

stop:
    deno run --config tests/deno.json --frozen --allow-read --allow-write=.state --allow-env --allow-run scripts/runtime.ts stop dev

# Explicitly destructive development operation; ordinary run preserves data.
[script]
reset:
    ^just _environment dev
    ^just _reset dev

# Install locked consumers and validate both projections without starting workloads.
[script]
prepare:
    ^deno install --config tests/deno.json --frozen
    ^just _environment dev
    ^just _compose dev db config --quiet
    ^just _compose dev engine config --quiet

[script]
logs unit="all":
    def main [unit: string] {
        if $unit not-in [all db engine] { error make {msg: "unit must be all, db or engine"} }
        let project = (^just _project dev | str trim)
        let names = if $unit == all {[$"($project)-db" $"($project)-engine"]} else {[$"($project)-($unit)"]}
        ^podman logs --follow --names ...$names
    }

[script]
status:
    for unit in [db engine] { ^just _compose dev $unit ps }
    let project = (^just _project dev | str trim)
    ^podman pod ps --filter $"label=gwa_project=($project)"

# Generated outputs only; no data/locks/dependencies are removed.
clean:
    cargo clean --manifest-path engine/Cargo.toml
