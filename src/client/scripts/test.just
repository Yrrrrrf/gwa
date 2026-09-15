# test.just — test runner and coverage

TEST_RULES := '''
[
  {
    "packages": "sdk/*",
    "pattern": "sdk/**/src/entities/*.test.ts",
    "engine": "deno",
    "cwd": "{root}",
    "command": ["deno", "test", "--allow-all", "{package}"]
  },
  {
    "packages": "sdk/*",
    "pattern": "sdk/**/*.svelte.ts",
    "engine": "vitest",
    "cwd": "{root}",
    "command": ["deno", "run", "-A", "npm:vitest", "run", "--config", "./config/vitest.config.ts", "--project", "{name}"]
  },
  {
    "packages": "apps/*",
    "pattern": "apps/**/src/App.test.ts",
    "engine": "vitest",
    "cwd": "{root}",
    "command": ["deno", "run", "-A", "npm:vitest", "run", "--config", "./config/vitest.config.ts", "--project", "{name}"]
  },
  {
    "packages": "apps/*",
    "pattern": "apps/**/src/routes/*.test.ts",
    "engine": "vitest",
    "cwd": "{root}",
    "command": ["deno", "run", "-A", "npm:vitest", "run", "--config", "./config/vitest.config.ts", "--project", "{name}"]
  }
]
'''

[doc('Run dynamic test matrix across SDK and Apps (pass -v for logs, -p for parallel)')]
[group('test')]
[positional-arguments]
test *flags:
    ^{{ CLI }} matrix --title "TEST" --rules '{{ TEST_RULES }}' {{ flags }}

[doc('Test coverage via Vitest')]
[group('test')]
[positional-arguments]
coverage *flags:
    ^deno run -A npm:vitest run --coverage --config ./config/vitest.config.ts {{ flags }}
