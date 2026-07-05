[doc('Run full CI pipeline (check + test)')]
[group('ci')]
ci: check test

# commit answer='y': ci
[doc('Commit with AI-generated message via azathoth (pass y to auto-accept)')]
[group('ci')]
commit answer='': fmt
    #!/usr/bin/env nu
    open --raw ("~/Documents/lab/ai/.env" | path expand)
        | lines
        | parse "{key}={value}"
        | reduce -f {} {|it, acc| $acc | insert $it.key $it.value }
        | load-env
    git add -A
    {{ if answer == '' { '' } else { "'" + answer + "' | " } }}uvx azathoth workflow commit
