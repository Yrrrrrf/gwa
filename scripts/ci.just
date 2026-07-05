[doc('Run full CI pipeline (check + test)')]
[group('ci')]
ci: check test

# commit answer='y': ci
[doc('Commit with AI-generated message via azathoth (auto-accepts prompt)')]
[group('ci')]
commit answer='y':
    #!/usr/bin/env nu
    open --raw ("~/Documents/lab/ai/.env" | path expand)
        | lines
        | where $it =~ '^\s*[A-Za-z_][A-Za-z0-9_]*='
        | split column -n 2 '=' key value
        | reduce -f {} {|row, acc| $acc | insert $row.key $row.value }
        | load-env
    git add -A
    '{{ answer }}' | uvx azathoth workflow commit
