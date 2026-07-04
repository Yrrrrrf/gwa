#!/usr/bin/env nu

def run-surql [
    file: path
    url: string
    user: string
    pass: string
    ns: string
    db: string
] {
    let content = open --raw $file
    let query = $"USE NS ($ns); USE DB ($db);\n($content)"
    
    # Send request using http post with basic auth
    let response = (http post --user $user --password $pass --headers {Accept: "application/json"} $url $query)
    
    # Nushell parses JSON response into structured list of records
    # Check if any query in the response had status == "ERR"
    let errs = ($response | where status == "ERR")
    if ($errs | is-empty) {
        { status: "OK", response: $response }
    } else {
        { status: "ERR", detail: ($errs | get 0 | get -i detail | default "Unknown error") }
    }
}

def main [] {
    let url = ($env.SURREAL_URL? | default "http://localhost:8000/sql")
    let user = ($env.SURREAL_USER? | default "root")
    let pass = ($env.SURREAL_PASS? | default "root")
    let ns = ($env.SURREAL_NS? | default "template")
    let db = ($env.SURREAL_DB? | default "main")
    
    print $"(ansi bold)Template — SurrealDB Initialization(ansi reset)"
    print $"(ansi blue)→ Provisioning Namespace/DB(ansi reset)"
    
    let prov_query = $"DEFINE NAMESPACE IF NOT EXISTS ($ns); DEFINE DATABASE IF NOT EXISTS ($db) ON NAMESPACE ($ns);"
    let prov_resp = (
        http post --user $user --password $pass --headers {Accept: "application/json"} $url $prov_query
    )
    
    let prov_errs = ($prov_resp | where status == "ERR")
    if not ($prov_errs | is-empty) {
        print $"\t(ansi red)✗ Provisioning failed(ansi reset)"
        print $prov_resp
        exit 1
    }
    
    print $"\t(ansi green)✓ Namespace: ($ns), Database: ($db)(ansi reset)\n"
    
    let base_dir = "/init"
    # Find all directories under /init/ and sort them
    let dirs = (ls $base_dir | where type == "dir" | get name | sort)
    
    for dir in $dirs {
        let dirname = ($dir | path basename)
        print $"(ansi blue)→ ($dirname)(ansi reset)"
        
        # Find all .surql files in this directory and sort them
        let files = (glob $"($dir)/*.surql" | sort)
        for f in $files {
            let filename = ($f | path basename)
            let relative_path = $"($dirname)/($filename)"
            
            # Print bullet point
            let bullet = $"\t(ansi grey)• ($relative_path)(ansi reset) "
            
            let res = (run-surql $f $url $user $pass $ns $db)
            if $res.status == "ERR" {
                print $"($bullet)(ansi red)✗(ansi reset)"
                print $"(ansi red)    ($res.detail)(ansi reset)"
                exit 1
            } else {
                print $"($bullet)(ansi green)✓(ansi reset)"
            }
        }
        print ""
    }
    
    print $"(ansi green)✓ Initialization complete — ($ns)/($db)(ansi reset)\n"
}
