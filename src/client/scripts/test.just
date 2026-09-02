# test.just — test runner and coverage

TEST_RULES := '''
[
  {
    "pattern": "sdk/**/src/entities/*.test.ts",
    "engine": "deno",
    "cmd": "deno test --allow-all {dir}"
  },
  {
    "pattern": "sdk/**/*.svelte.ts",
    "engine": "vitest",
    "cmd": "deno run -A npm:vitest run --config ./config/vitest.config.ts --project {name}"
  },
  {
    "pattern": "apps/**/src/App.test.ts",
    "engine": "vitest",
    "cmd": "deno run -A npm:vitest run --config ./config/vitest.config.ts --project {name}"
  },
  {
    "pattern": "apps/**/src/routes/*.test.ts",
    "engine": "vitest",
    "cmd": "deno run -A npm:vitest run --config ./config/vitest.config.ts --project {name}"
  }
]
'''

[doc('Run dynamic test matrix across SDK and Apps (pass -v for logs, -p for parallel)')]
[group('test')]
[positional-arguments]
test *flags:
    ^deno run -A scripts/cli/main.ts matrix --title "TEST" --rules '{{ TEST_RULES }}' {{ flags }}

[doc('Test coverage via Vitest')]
[group('test')]
[positional-arguments]
coverage *flags:
    ^deno run -A npm:vitest run --coverage --config ./config/vitest.config.ts {{ flags }}
