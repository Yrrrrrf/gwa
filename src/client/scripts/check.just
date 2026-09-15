# check.just — fix · writes & type/quality gates

[doc('Format workspace')]
[group('check')]
fmt:
    ^biome format --config-path=config/biome.json --write .

[doc('Lint workspace')]
[group('check')]
lint:
    -^biome lint --config-path=config/biome.json .

[doc('Audit all code namespaces')]
[group('check')]
audit:
    ^deno run -A npm:fallow -c config/fallowrc.json

[doc('Check code health')]
[group('check')]
health:
    ^deno run -A npm:fallow health --score -c config/fallowrc.json

# ── Dynamic Matrix Quality Gates ────────────────────────────────────────

TYPES_RULES := '''
[
  {
    "packages": "sdk/*",
    "pattern": "sdk/**/*.svelte.ts",
    "engine": "svelte-check-native",
    "cwd": "{root}",
    "command": ["deno", "run", "-A", "npm:svelte-check-native", "--tsconfig", "sdk/tsconfig.json", "--config", "{package}/vite.config.ts"]
  },
  {
    "packages": "sdk/*",
    "pattern": "sdk/**/src/mod.ts",
    "engine": "deno",
    "cwd": "{package}",
    "command": ["deno", "check", "{file}"]
  },
  {
    "packages": "apps/*",
    "pattern": "apps/**/src/routes",
    "engine": "svelte-check-native",
    "cwd": "{root}",
    "command": ["deno", "run", "-A", "npm:svelte-check-native", "--workspace", "{package}", "--tsconfig", "tsconfig.json", "--config", "vite.config.mts"]
  },
  {
    "packages": "apps/*",
    "pattern": "apps/**/src/App.vue",
    "engine": "vue-tsc",
    "cwd": "{root}",
    "command": ["deno", "run", "-A", "npm:vue-tsc", "-p", "{package}/tsconfig.json", "--noEmit"]
  },
  {
    "packages": "apps/*",
    "pattern": "apps/**/src/App.tsx",
    "engine": "tsc",
    "cwd": "{root}",
    "command": ["deno", "run", "-A", "npm:typescript@6/tsc", "-p", "{package}/tsconfig.json", "--noEmit"]
  }
]
'''

[doc('Type-check workspace across SDKs and Apps using declarative rules')]
[group('check')]
[positional-arguments]
types *flags:
    # needed by scn
    ^deno install --entrypoint npm:svelte-check-native npm:@typescript/native-preview npm:typescript@6 npm:vue-tsc@3.3.11
    ^deno run -A scripts/compat.ts
    ^{{ CLI }} matrix --title "TYPES" --rules '{{ TYPES_RULES }}' {{ flags }}

[doc('Run all check quality gates (pass -v for detailed logs, -b for timing, -p for parallel)')]
[group('check')]
[positional-arguments]
check *args: fmt lint (types args)
