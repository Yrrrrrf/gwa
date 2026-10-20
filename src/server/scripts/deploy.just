# Initialize an empty database; refuse existing business data.
[script]
db-init profile="dev":
    def main [profile: string] { let project = (^just _project $profile | str trim); if not ($".state/($project).json" | path exists) { ^just _environment $profile }; ^just _up $profile db; ^just _ready $profile db; ^just _db init $profile }

# Apply append-only migrations with checksums and a database lock.
[script]
db-migrate profile="dev":
    def main [profile: string] { let project = (^just _project $profile | str trim); if not ($".state/($project).json" | path exists) { ^just _environment $profile }; ^just _up $profile db; ^just _ready $profile db; ^just _db upgrade $profile }

[private, script]
_db action profile="dev" upto="all":
    def main [action: string, profile: string, upto: string] {
        if $action not-in [init upgrade verify ensure] { error make {msg: "action must be init, upgrade, verify or ensure"} }
        let project = ($env.GWA_PROJECT? | default (open $"config/profiles/($profile).toml").profile.project)
        let state = (open $".state/($project).json")
        def sql [file: string, project: string, params: record = {}] {
            let result = (^just _sql $file $project ($params | to json --raw) | complete)
            if $result.exit_code != 0 { error make {msg: $result.stderr} }
            $result.stdout | from json
        }
        mut baseline = ""
        for dir in $state.config.database.definition_order {
            for file in (glob $"db/definitions/($dir)/*.surql" | sort) { $baseline = ($baseline + (char newline) + (open --raw $file)) }
        }
        mut expected = [{version: '0001-baseline', checksum: ($baseline | hash sha256), body: $baseline}]
        for file in (glob 'db/migrations/*.surql' | sort) {
            let version = ($file | path parse | get stem)
            let body = (open --raw $file)
            $expected = ($expected | append {version: $version, checksum: ($body | hash sha256), body: $body})
        }
        if $upto != all {
            if $upto not-in ($expected | get version) { error make {msg: "unknown migration boundary"} }
            $expected = ($expected | take until {|row| $row.version > $upto})
        }
        if $action != verify {
            let _reply = (sql db/operations/bootstrap.surql $project {NS_IDENT: $state.env.GWA_DB_NS, DB_IDENT: $state.env.GWA_DB_NAME})
        }
        let owner = (random uuid)
        if $action != verify { let _reply = (sql db/operations/lock.surql $project {OWNER: $owner}) }
        try {
            print -e "Inspect migration ledger"
            let applied = (sql db/operations/inspect.surql $project | last | get result)
            if ($applied | length) > ($expected | length) { error make {msg: "database is ahead of this migration history"} }
            for pair in ($applied | enumerate) {
                let wanted = ($expected | get $pair.index)
                if $pair.item.version != $wanted.version or $pair.item.checksum != $wanted.checksum { error make {msg: "applied migration checksum/history mismatch"} }
            }
            let action = (if $action == ensure { if ($applied | is-empty) {"init"} else {"upgrade"} } else {$action})
            if $action == init {
                let tables = (sql db/operations/info.surql $project | last | get result.tables | columns | where {|name| $name not-in [migration migration_lock]})
                if ($applied | is-not-empty) or ($tables | is-not-empty) { error make {msg: "initialization requires an empty database"} }
            } else if ($applied | is-empty) { error make {msg: "database is not initialized"} }
            let pending = ($expected | skip ($applied | length))
            if $action == verify and ($pending | is-not-empty) { error make {msg: "pending migrations"} }
            if $action != verify {
                for migration in $pending {
                    print -e $"Apply ($migration.version)"
                    let _reply = (sql db/operations/apply.surql $project {BODY: $migration.body, VERSION: $migration.version, CHECKSUM: $migration.checksum})
                }
                if $action == init {
                    let seed = if ($project | str starts-with gwa-test-) {"test"} else {$state.config.profile.seed}
                    if ($seed | is-not-empty) { print -e $"Seed ($seed)"; let _reply = (sql $"db/seeds/($seed).surql" $project) }
                }
            }
        } catch {|failure|
            if $action != verify {
                try { let _reply = (sql db/operations/unlock.surql $project {OWNER: $owner}) } catch {|cleanup| print -e $"Unlock also failed: ($cleanup.msg)" }
            }
            error make {msg: $failure.msg}
        }
        if $action != verify { let _reply = (sql db/operations/unlock.surql $project {OWNER: $owner}) }
    }

# Validate and build both images before selecting production storage policy.
[script]
deploy policy="configured": build
    def main [policy: string] {
        ^just _environment prod
        let policy = (if $policy == configured {(open config/profiles/prod.toml).profile.data_policy} else {$policy})
        if $policy not-in [reset initialize upgrade] { error make {msg: "policy must be reset, initialize or upgrade"} }
        ^just _environment prod
        if $policy == reset {
            print 'RESET deletes gwa-prod-database and gwa-prod-artifacts. No backup is created.'
            let answer = (input 'Type gwa-prod to confirm: ')
            if $answer != gwa-prod { error make {msg: "reset cancelled"} }
            $env.GWA_RESET_PROJECT = gwa-prod
            ^just _reset prod
        }
        ^just _compose prod engine down
        if $policy in [reset initialize] { ^just db-init prod } else { ^just db-migrate prod }
        ^just _up prod engine
        ^just _ready prod engine
    }
