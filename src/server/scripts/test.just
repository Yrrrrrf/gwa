# Disposable consumer tests; category follows tests/<category>.
[script]
test category="all":
    def main [category: string] {
        if $category =~ '(^/|\.\.|[^a-zA-Z0-9_/-])' { error make {msg: "invalid test category"} }
        let path = if $category == all {"tests"} else {$"tests/($category)"}
        if not ($path | path exists) { error make {msg: "unknown test category"} }
        $env.GWA_PROJECT = $"gwa-test-(random uuid | str substring 0..7)"
        mut ports = []
        while ($ports | length) < 3 {
            let candidate = (port)
            if $candidate not-in $ports { $ports = ($ports | append $candidate) }
        }
        $env.GWA_DB_PORT = ($ports.0 | into string)
        $env.GWA_HTTP_PORT = ($ports.1 | into string)
        $env.GWA_GRPC_PORT = ($ports.2 | into string)
        ^just _images dev
        try {
            ^just _reset dev
            ^just db-init dev
            ^just _up dev engine
            ^just _ready dev engine
            ^just _consumer $category $env.GWA_PROJECT
        } catch {|failure| ^just _reset dev no; error make {msg: $failure.msg} }
        ^just _reset dev no
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
        let typescripts = (glob $"($path)/**/*_test.ts" | sort)
        if ($typescripts | is-not-empty) { ^just _exec exec --title 'DENO CONSUMERS' -- deno test --config tests/deno.json --frozen --allow-read --allow-write=.state --allow-env --allow-net --allow-run ...$typescripts }
    }

test-unit:
    just _exec exec --title 'RUST UNIT' -- cargo test --locked --manifest-path engine/Cargo.toml
