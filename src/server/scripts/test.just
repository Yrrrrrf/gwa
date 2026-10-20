# Disposable consumer tests; category follows tests/<category>.
[script]
test category="all":
    def main [category: string] {
        if $category =~ '(^/|\.\.|[^a-zA-Z0-9_/-])' { error make {msg: "invalid test category"} }
        let path = if $category == all {"tests"} else {$"tests/($category)"}
        if not ($path | path exists) { error make {msg: "unknown test category"} }
        let selected = ((glob $"($path)/**/*.hurl") | append (glob $"($path)/**/*_test.ts"))
        if ($selected | is-empty) { error make {msg: "test selection contains no tests"} }
        if ($category | str starts-with scripts) or ($category | str starts-with engine/shared) {
            ^deno test --config tests/deno.json --frozen --allow-read --allow-write=.state --allow-env --allow-run --allow-net $path
            return
        }
        $env.GWA_PROJECT = $"gwa-test-(random uuid | str substring 0..7)"
        mut ports = []
        while ($ports | length) < 3 {
            let candidate = (port)
            if $candidate not-in $ports { $ports = ($ports | append $candidate) }
        }
        $env.GWA_DB_PORT = ($ports.0 | into string)
        $env.GWA_HTTP_PORT = ($ports.1 | into string)
        $env.GWA_GRPC_PORT = ($ports.2 | into string)
        ^just _environment dev
        try {
            ^just _images dev
            ^just _reset dev
            ^just _up dev db
            ^just _ready dev db
            ^just _db init dev
            ^just _up dev engine
            ^just _ready dev engine
            ^just _consumer $category $env.GWA_PROJECT
        } catch {|failure|
            let cleanup = (^just _reset dev no | complete)
            if $cleanup.exit_code != 0 { print -e $"Cleanup also failed; runtime snapshot retained: ($cleanup.stderr)" } else {
                rm $".state/($env.GWA_PROJECT).json" $".state/($env.GWA_PROJECT).toml"
            }
            error make {msg: $failure.msg}
        }
        ^just _reset dev no
        rm $".state/($env.GWA_PROJECT).json" $".state/($env.GWA_PROJECT).toml"
    }

[private, script]
_consumer category project:
    def main [category: string, project: string] {
        let state = (open $".state/($project).json")
        load-env $state.env
        let path = if $category == all {"tests"} else {$"tests/($category)"}
        $env.HURL_SECRET_db_password = $env.GWA_DB_PASSWORD
        $env.HURL_SECRET_api_token = $env.GWA_API_TOKEN
        $env.HURL_SECRET_db_auth = ($"($env.GWA_DB_USER):($env.GWA_DB_PASSWORD)" | encode base64)
        let hurls = (glob $"($path)/**/*.hurl" | sort)
        if ($hurls | is-not-empty) {
            ^just _exec exec --title 'HURL CONSUMERS' -- hurl --test --connect-timeout 3 --max-time 15 --variable $"db_url=($env.GWA_DB_URL)" --variable $"http_url=($env.GWA_HTTP_URL)" --variable $"db_user=($env.GWA_DB_USER)" --variable $"namespace=($env.GWA_DB_NS)" --variable $"database=($env.GWA_DB_NAME)" ...$hurls
        }
        let typescripts = (glob $"($path)/**/*_test.ts" | where {|file| $file !~ "/tests/(scripts/|engine/shared/)" } | sort)
        if ($typescripts | is-not-empty) { ^just _exec exec --title 'DENO CONSUMERS' -- deno test --config tests/deno.json --frozen --allow-read --allow-write=.state --allow-env --allow-net --allow-run ...$typescripts }
    }

test-unit:
    just _exec exec --title 'RUST UNIT' -- cargo test --locked --manifest-path engine/Cargo.toml
