# Only this root imports the five recipe files; no component Justfiles.
list:
    just --list --unsorted
menu:
    just _exec menu --justfile justfile

[private]
[script]
_exec *argv:
    def --wrapped main [...argv: string] {
        ^deno run --config tests/deno.json --frozen --allow-run --allow-read --allow-env --allow-write --allow-net jsr:@yrrrrrf/dv@0.0.4/cli ...$argv
    }

[private]
[script]
_project profile="dev":
    def main [profile: string] {
        if $profile not-in [dev prod] { error make {msg: "profile must be dev or prod"} }
        let project = ($env.GWA_PROJECT? | default (open $"config/profiles/($profile).toml").profile.project)
        if $project !~ '^gwa-(dev|prod|test-[a-z0-9-]+)$' { error make {msg: "invalid project name"} }
        if ($profile == prod and $project != gwa-prod) or ($profile == dev and $project == gwa-prod) { error make {msg: "profile/project mismatch"} }
        print $project
    }

# Generate once at the public operation boundary. Observation helpers only read.
[private]
[script]
_environment profile="dev":
    def main [profile: string] {
        let project = (^just _project $profile | str trim)
        let session = $".state/($project).session"
        if ($session | path exists) and (($env.GWA_SESSION? | default "") != (open --raw $"($session)/owner" | str trim)) {
            error make {msg: "stop the active session before changing its configuration"}
        }
        mut cfg = {}
        for file in [server database services toolchains] { $cfg = ($cfg | merge deep (open ($"config/($file).toml"))) }
        $cfg = ($cfg | merge deep (open ($"config/profiles/($profile).toml")))
        mut token = ($env | get -o $cfg.auth.token_env | default "")
        mut password = ($env | get -o $cfg.database.password_env | default "")
        if $profile == dev {
            if ($token | str trim | is-empty) { $token = $cfg.profile.dev_api_token }
            if ($password | str trim | is-empty) { $password = $cfg.profile.dev_db_password }
        } else {
            let dev = (open config/profiles/dev.toml).profile
            if ($token | str length) < 24 or ($password | str length) < 24 or $token == $dev.dev_api_token or $password == $dev.dev_db_password { error make {msg: "production requires explicit non-development credentials of at least 24 characters"} }
        }
        if $token =~ '[\r\n]' or $password =~ '[\r\n]' { error make {msg: "credentials cannot contain newlines"} }
        let host = ($env.GWA_HOST? | default $cfg.network.host)
        if $host not-in [127.0.0.1 localhost] { error make {msg: "published ports must remain loopback"} }
        let dbport = ($env.GWA_DB_PORT? | default ($cfg.database.bind | split row ':' | last) | into int)
        let httpport = ($env.GWA_HTTP_PORT? | default ($cfg.server.http_bind | split row ':' | last) | into int)
        let grpcport = ($env.GWA_GRPC_PORT? | default ($cfg.server.grpc_bind | split row ':' | last) | into int)
        let ports = [$dbport $httpport $grpcport]
        if ($ports | any {|p| $p < 1 or $p > 65535 }) or ($ports | uniq | length) != 3 { error make {msg: "ports must be distinct and within 1..65535"} }
        if $cfg.database.readiness_timeout_seconds <= 0 or $cfg.database.readiness_delay_ms <= 0 { error make {msg: "readiness limits must be positive"} }
        if $cfg.profile.data_policy not-in [upgrade reset] { error make {msg: "unknown data policy"} }
        let ns = ($env.GWA_DB_NS? | default $cfg.database.namespace)
        let database = ($env.GWA_DB_NAME? | default $cfg.database.database)
        for identifier in [$ns $database] { if $identifier !~ '^[a-zA-Z_][a-zA-Z0-9_]*$' { error make {msg: "invalid database identifier"} } }
        let package = (open engine/Cargo.toml).package
        let inputs = ([.containerignore engine/Cargo.toml engine/Cargo.lock engine/build.rs engine/engine.Dockerfile db/db.Dockerfile config/toolchains.toml] | append (glob 'engine/src/**/*.rs') | append (glob 'config/contracts/**/*.proto') | sort)
        let digest = ($inputs | each {|file| let relative = ($file | path expand | path relative-to (pwd)); $"($relative):((open --raw $file) | hash sha256)"} | str join (char newline) | hash sha256 | str substring 0..11)
        mkdir .state
        ^chmod 700 .state
        let runtime = ($".state/($project).toml" | path expand)
        # Mount only runtime fields, never development credentials or tool policy.
        let projection = ($cfg | select server worker auth services | insert profile ($cfg.profile | select name log_format))
        let vars = {
            GWA_PROJECT: $project, GWA_VERSION: $package.version, GWA_IMAGE_TAG: $"($package.version)-($digest)", GWA_RUST_VERSION: $package.rust-version,
            GWA_NU_VERSION: $cfg.toolchains.nushell, GWA_DB_VERSION: $cfg.toolchains.surrealdb,
            GWA_API_TOKEN: $token, GWA_API_TOKEN_ENV: $cfg.auth.token_env, GWA_DB_PASSWORD: $password,
            GWA_DB_USER: $cfg.database.user, GWA_DB_NS: $ns, GWA_DB_NAME: $database,
            GWA_DB_BIND: $cfg.database.bind, GWA_DB_PATH: $cfg.database.path,
            GWA_DB_INTERNAL_PORT: ($cfg.database.bind | split row ':' | last),
            GWA_HTTP_INTERNAL_PORT: ($cfg.server.http_bind | split row ':' | last),
            GWA_GRPC_INTERNAL_PORT: ($cfg.server.grpc_bind | split row ':' | last),
            GWA_DB_PORT: ($dbport | into string), GWA_HTTP_PORT: ($httpport | into string), GWA_GRPC_PORT: ($grpcport | into string),
            GWA_HOST: $host, GWA_DB_URL: $"http://($host):($dbport)", GWA_HTTP_URL: $"http://($host):($httpport)", GWA_GRPC_ADDR: $"($host):($grpcport)",
            GWA_RESTART_POLICY: $cfg.profile.restart_policy,
            GWA_NETWORK: $"($project)-network", GWA_DB_VOLUME: $"($project)-database", GWA_ARTIFACT_VOLUME: $"($project)-artifacts", GWA_CONFIG: $runtime
        }
        let suffix = (random uuid)
        let config_tmp = $"($runtime).($suffix).tmp"
        let state = $".state/($project).json"
        let state_tmp = $"($state).($suffix).tmp"
        $projection | to toml | save $config_tmp
        {config: $cfg, env: $vars} | to json | save $state_tmp
        ^chmod 644 $config_tmp
        ^chmod 600 $state_tmp
        mv --force $config_tmp $runtime
        mv --force $state_tmp $state
    }

[private]
[script]
_state profile="dev":
    def main [profile: string] {
        let project = (^just _project $profile | str trim)
        let path = $".state/($project).json"
        if not ($path | path exists) { error make {msg: "no runtime snapshot; use just run or just prepare first"} }
        open $path | to json | print
    }

[private]
[script]
_compose profile unit *argv:
    def --wrapped main [profile: string, unit: string, ...argv: string] {
        if $unit not-in [db engine] { error make {msg: "unit must be db or engine"} }
        let state = (^just _state $profile | from json)
        let version = (^podman-compose --version | str trim)
        load-env $state.env
        $env.GWA_POD = $"($state.env.GWA_PROJECT)-($unit)-pod"
        ^podman-compose --podman-path podman -f compose.yaml -p $"($state.env.GWA_PROJECT)-($unit)" --profile $unit ...$argv
    }

[private]
[script]
_images profile="dev":
    def main [profile: string] {
        # Build order is real: the engine reuses the DB image's Nushell binary.
        ^just _compose $profile db build db
        ^just _compose $profile engine build engine
    }

[private]
[script]
_volumes profile="dev":
    def main [profile: string] {
        let vars = (^just _state $profile | from json).env
        for volume in [$vars.GWA_DB_VOLUME $vars.GWA_ARTIFACT_VOLUME] {
            let exists = (^podman volume exists $volume | complete)
            if $exists.exit_code == 0 {
                let owner = (^podman volume inspect $volume | from json | first | get Labels.gwa_project?)
                if $owner != $vars.GWA_PROJECT { error make {msg: $"refusing unowned volume ($volume)"} }
            } else if $exists.exit_code == 1 {
                let created = (^podman volume create --label $"gwa_project=($vars.GWA_PROJECT)" $volume | complete)
                if $created.exit_code != 0 { error make {msg: $created.stderr} }
            } else { error make {msg: $exists.stderr} }
        }
    }

[private]
[script]
_network profile="dev":
    def main [profile: string] {
        let vars = (^just _state $profile | from json).env
        let exists = (^podman network exists $vars.GWA_NETWORK | complete)
        if $exists.exit_code == 0 {
            let owner = (^podman network inspect $vars.GWA_NETWORK | from json | first | get labels.gwa_project?)
            if $owner != $vars.GWA_PROJECT { error make {msg: "refusing unowned network"} }
        } else if $exists.exit_code == 1 {
            let created = (^podman network create --label $"gwa_project=($vars.GWA_PROJECT)" $vars.GWA_NETWORK | complete)
            if $created.exit_code != 0 { error make {msg: $created.stderr} }
        } else { error make {msg: $exists.stderr} }
    }

# Protect predictable pod/container names before Compose can reuse or remove them.
[private]
[script]
_ownership profile unit:
    def main [profile: string, unit: string] {
        if $unit not-in [db engine] { error make {msg: "unknown unit"} }
        let vars = (^just _state $profile | from json).env
        let name = $"($vars.GWA_PROJECT)-($unit)"
        for kind in [pod container] {
            let target = if $kind == pod {$"($name)-pod"} else {$name}
            let exists = (^podman $kind exists $target | complete)
            if $exists.exit_code == 0 {
                let item = (^podman $kind inspect $target | from json | first)
                let owner = if $kind == pod {$item.Labels.gwa_project?} else {$item.Config.Labels | get -o 'io.podman.compose.project'}
                let expected = if $kind == pod {$vars.GWA_PROJECT} else {$name}
                if $owner != $expected { error make {msg: $"refusing unowned ($kind) ($target)"} }
            } else if $exists.exit_code != 1 { error make {msg: $exists.stderr} }
        }
    }

[private]
[script]
_up profile="dev" unit="db":
    def main [profile: string, unit: string] {
        ^just _ownership $profile $unit
        ^just _volumes $profile
        ^just _network $profile
        ^just _compose $profile $unit up -d --no-build $unit
    }

[private]
[script]
_down profile="dev":
    def main [profile: string] {
        let vars = (^just _state $profile | from json).env
        mut failures = []
        for unit in [engine db] {
            let ownership = (^just _ownership $profile $unit | complete)
            if $ownership.exit_code != 0 { $failures = ($failures | append $ownership.stderr); continue }
            let pod = (^podman pod exists $"($vars.GWA_PROJECT)-($unit)-pod" | complete)
            let container = (^podman container exists $"($vars.GWA_PROJECT)-($unit)" | complete)
            if $pod.exit_code == 1 and $container.exit_code == 1 { continue }
            let result = (^just _compose $profile $unit down | complete)
            if $result.exit_code != 0 { $failures = ($failures | append $result.stderr) }
        }
        let exists = (^podman network exists $vars.GWA_NETWORK | complete)
        if $exists.exit_code == 0 {
            let owner = (^podman network inspect $vars.GWA_NETWORK | from json | first | get labels.gwa_project?)
            if $owner != $vars.GWA_PROJECT { $failures = ($failures | append "refusing unowned network") } else {
                let result = (^podman network rm $vars.GWA_NETWORK | complete)
                if $result.exit_code != 0 { $failures = ($failures | append $result.stderr) }
            }
        } else if $exists.exit_code != 1 { $failures = ($failures | append $exists.stderr) }
        if ($failures | is-not-empty) { error make {msg: ($failures | str join (char newline))} }
    }

[private]
[script]
_reset profile="dev" recreate="yes":
    def main [profile: string, recreate: string] {
        let vars = (^just _state $profile | from json).env
        if $profile == prod and ($env.GWA_RESET_PROJECT? | default "") != $vars.GWA_PROJECT { error make {msg: "production reset requires the explicit deploy confirmation"} }
        ^just _down $profile
        # Check all owners before removing any volume; do not create during teardown.
        mut owned = []
        for volume in [$vars.GWA_DB_VOLUME $vars.GWA_ARTIFACT_VOLUME] {
            let exists = (^podman volume exists $volume | complete)
            if $exists.exit_code == 0 {
                let owner = (^podman volume inspect $volume | from json | first | get Labels.gwa_project?)
                if $owner != $vars.GWA_PROJECT { error make {msg: $"refusing unowned volume ($volume)"} }
                $owned = ($owned | append $volume)
            } else if $exists.exit_code != 1 { error make {msg: $exists.stderr} }
        }
        for volume in $owned {
            let result = (^podman volume rm $volume | complete)
            if $result.exit_code != 0 { error make {msg: $result.stderr} }
        }
        if $recreate == yes { ^just _volumes $profile }
    }

[private]
[script]
_ready profile="dev" unit="db":
    def main [profile: string, unit: string] {
        if $unit not-in [db engine] { error make {msg: "unknown unit"} }
        let state = (^just _state $profile | from json)
        let name = $"($state.env.GWA_PROJECT)-($unit)"
        let url = if $unit == db { $"($state.env.GWA_DB_URL)/health" } else { $"($state.env.GWA_HTTP_URL)/ready" }
        let deadline = (date now) + ($state.config.database.readiness_timeout_seconds | into duration --unit sec)
        loop {
            let container = (^podman container inspect $name | from json | first)
            if not $container.State.Running or ($container.State.Health.Status? | default "") == unhealthy {
                ^podman logs --tail 30 $name
                error make {msg: $"container failed before readiness: ($unit)"}
            }
            let remaining = $deadline - (date now)
            if $remaining <= 0sec { error make {msg: $"readiness deadline exceeded: ($unit) ($url)"} }
            let timeout = ([$remaining 2sec] | math min)
            let ready = (try { let reply = (http get --max-time $timeout $url); if $unit == db {true} else {$reply.ready} } catch {false})
            if $ready { return }
            sleep ([$remaining ($state.config.database.readiness_delay_ms | into duration --unit ms)] | math min)
        }
    }

[private]
[script]
_sql file project params="{}":
    def main [file: string, project: string, params: string] {
        let vars = (open $".state/($project).json").env
        mut body = (open --raw $file)
        let values = ($params | from json)
        for key in ($values | columns) {
            let value = ($values | get $key)
            let rendered = if ($key | str ends-with '_IDENT') {
                if $value !~ '^[a-zA-Z_][a-zA-Z0-9_]*$' { error make {msg: "unsafe SQL identifier"} }
                $value
            } else if $key == BODY { $value } else { $value | to json --raw }
            $body = ($body | str replace --all $"__($key)__" $rendered)
        }
        if $body =~ '__[A-Z_]+__' { error make {msg: "unresolved SQL placeholders"} }
        let auth = ($"($vars.GWA_DB_USER):($vars.GWA_DB_PASSWORD)" | encode base64)
        let reply = (http post --max-time 30sec --headers {Authorization: $"Basic ($auth)", Accept: application/json, surreal-ns: $vars.GWA_DB_NS, surreal-db: $vars.GWA_DB_NAME} --content-type text/plain $"($vars.GWA_DB_URL)/sql" $body)
        let failures = ($reply | where status != OK)
        if ($failures | is-not-empty) { error make {msg: ($failures | to json --raw)} }
        $reply | to json --raw | print
    }
