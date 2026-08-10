[doc('Run full CI pipeline (check + test)')]
[group('ci')]
ci: check test

[doc('Clear cache. Remove and reinstall dependencies')]
[group('ci')]
prepare: client::prepare server::prepare cli::prepare

[doc('Use the pi agent to create an skill based on the pkg')]
[group('ai')]
create-skill:
    #!/usr/bin/env nu
    # todo: Use the pi command -p to pass a prompt for the agent to use azathoth then create the skills for the current pkg!
    uvx azathoth ingest .  # this creates a new file with the content of the current repo! :D
    # then this project must handle the pipeline to create the skill from this new file.
    deno run -A npm:@earendil-works/pi-coding-agent -p "prompt"
