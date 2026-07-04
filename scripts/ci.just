[doc('Run full CI pipeline (check + test)')]
[group('ci')]
ci: check test

[doc('Commit code with safety checks, ensuring no broken tree is committed')]
[group('ci')]
commit msg: ci
    git add -A
    git commit -m "{{msg}}"
