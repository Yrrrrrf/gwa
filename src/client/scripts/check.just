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
    "pattern": "sdk/**/*.svelte.ts",
    "engine": "svelte-check",
    "cmd": "deno run -A npm:svelte-check@^4.7.5 --tsconfig config/tsconfig.json --config {dir}/vite.config.ts --threshold error"
  },
  {
    "pattern": "sdk/**/src/mod.ts",
    "engine": "deno",
    "cmd": "deno check {file}"
  },
  {
    "pattern": "apps/**/src/routes",
    "engine": "svelte-check",
    "cmd": "deno run -A npm:svelte-check@^4.7.5 --tsconfig {dir}/tsconfig.json --config {dir}/vite.config.mts"
  },
  {
    "pattern": "apps/**/src/App.vue",
    "engine": "vue-tsc",
    "cmd": "deno check {dir}/src/lib/mod.ts"
  },
  {
    "pattern": "apps/**/src/App.tsx",
    "engine": "tsc",
    "cmd": "deno check {dir}/src/lib/mod.ts"
  }
]
'''

[doc('Type-check workspace across SDKs and Apps using declarative rules')]
[group('check')]
[positional-arguments]
types *flags:
    ^deno run -A scripts/cli/main.ts matrix --title "TYPES" --rules '{{ TYPES_RULES }}' {{ flags }}

[doc('Run all check quality gates (pass -v for detailed logs, -b for timing, -p for parallel)')]
[group('check')]
[positional-arguments]
check *args: fmt lint (types args)
