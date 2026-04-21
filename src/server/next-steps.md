# 🔌 GWA Server · Next Steps

**Status:** Forward-looking guide · Phases A–D are complete as of 2026-04-19.
**Premise:** The tri-path validation model is live. 15 Hurl files, 16 TS DB
specs, 4 engine specs (1 tracked `it.fails`), 5 Go interceptor tests, a grpcurl
smoke script, 2 Connect-ts specs, and 3 cross-path e2e tests all run green in a
single `just test-triangle` invocation. What's left isn't a new feature — it's
hardening, closing the one known wire gap, and making the template ready to hand
to someone else. **Voice:** Pragmatic. Not strict-spec. This document is for
orientation and decision-making, not enforcement.

---

## 0. Where the server stands right now

```
┌──────────────────────────────────────────────────────────────────────┐
│  STATE AS OF 2026-04-19                                              │
│                                                                       │
│   🗄️  SurrealDB     ✓ 15/15 Hurl   ✓ 16/16 TS      ✓ 3/3 e2e         │
│   🦀 Engine         ✓ 1 cargo      ✓ 3 TS / 1 fails ✓ covered         │
│   🐹 RPC            ✓ 1 go unit    ✓ smoke 5/5      ✓ 2 connect-ts    │
│   🚀 E2E            ✓ 3 cross-path paths green                       │
│   📋 TODOS.md       1 tracked item: engine-create-comment-count      │
│                                                                       │
│   Total runtime of `just test-triangle`: ~5s from warm cache.         │
│   Total test count: ~45 assertions across 8 invocation surfaces.      │
└──────────────────────────────────────────────────────────────────────┘
```

That's the healthy surface. Below it, a few things are worth knowing about that
the green lights don't tell you.

### 0.1 The visible debt

These show up directly in the test output:

1. **`engine-create-comment-count`** — still red (via `it.fails`). The engine's
   `createItem` mutation doesn't set `comment_count = 0`; SurrealDB's `TYPE int`
   field then can't coerce `NULL`. This is the first thing to close.
2. **`store::from_domain` dead code warning** —
   `core/store/src/repos/item.rs:46` has an unused associated function. Cargo is
   telling you that a method was scaffolded but never wired. Either wire it or
   delete it — warnings that linger become invisible.
3. **`go test` proto-connect package missing** —
   `gen/template/v1/templatev1connect/documents.connect.go` wants
   `connectrpc.com/connect`, which isn't in `go.mod`. The workaround
   (`grep -v templatev1connect`) excludes it from the build, which means the
   generated Go Connect stubs exist but are not validated as compilable. If you
   decide to never consume them from Go, delete them via `buf.gen.yaml`. If you
   might, run `go get connectrpc.com/connect` and drop the grep.

### 0.2 The invisible debt

These don't show up in the test output but matter:

1. **5 `it.todo` placeholders** in `e2e/failure-localization.test.ts`. Each one
   describes a localization scenario that isn't implemented yet. The reporter
   shows them as todos — correctly — but they're currently reference material,
   not tests.
2. **Dev-mode authentication is plaintext.** Seed users have plaintext hashes;
   the engine compares them directly. Fine for a template that says "this is a
   template," dangerous for a template that gets forked silently.
3. **No per-run state isolation.** All tests write to `template:main`. Works
   today because the suite is small and serial. Breaks at parallelism or
   repeated runs without DB restart.
4. **JWT parity is convention, not contract.** `tests/lib/tokens.ts` and
   `rpc/tests/bin/mint-token/main.go` produce tokens meant to be identical. If
   they drift by one claim, every RPC test breaks silently.
5. **Request traces stop at service boundaries.** When an engine call hits the
   sidecar, there's no way to correlate the two log lines into one story. At 3
   services and ~50 tests this isn't painful; at 10 and 500 it's impossible.

None of the invisible debts are blockers. They're the reason Phase E exists.

---

## 1. Where to point next — the four tracks

Phase E as originally specified bundled isolation + observability +
documentation. Looking at what's actually in the repo now, those three should
split into separate tracks that can run independently. Rough priority order:

### Track 1 · Close the known wire gap **(do first — small, satisfying, clarifying)**

Fix `engine-create-comment-count` and delete its `it.fails` marker. Two possible
approaches from the spec's open questions:

- **Option A — engine writes the field explicitly.** The item-creation SQL in
  `engine/core/store/src/repos/item.rs` (or wherever `CREATE item SET ...` is
  assembled) adds `comment_count = 0` and `rating = 0`. The schema stays pure.
  Downside: every future consumer of the DB needs to remember this invariant.
- **Option B — DB schema declares the default.** In
  `db/init/01-schema/01-schema.surql`, change
  `DEFINE FIELD comment_count ON item TYPE int` to
  `DEFINE FIELD comment_count ON item TYPE int DEFAULT 0` (and the same for
  `rating`). One-line fix. Every future client — engine, sidecar, the Rust repl,
  a curl one-liner — gets the default for free.

**Recommendation:** **B.** The invariant ("comment_count is always present,
defaults to zero") belongs to the data, not to any particular consumer. Option A
puts the invariant at the wrong layer and guarantees the bug resurfaces the
moment a second writer exists.

**What "closing" looks like:**

1. Apply the schema change.
2. Re-run `just db::down && just db::run` (or whatever forces seed re-init).
3. Run `just test-triangle`. The `it.fails` test now reports as a **failure**,
   because the wire works and the marker is inverted.
4. In `integration/engine/items.test.ts`, change `it.fails(...)` back to
   `it(...)`. Remove the reason string.
5. In `tests/TODOS.md`, delete the `engine-create-comment-count` section.
6. Re-run `just test-triangle`. Confirm green.

That self-correcting loop is the payoff of the TDD discipline — the test tells
you when to retire the marker. Don't skip it, don't short-circuit it. It's the
model for every future wire bug.

### Track 2 · Per-run state isolation

The biggest correctness-rot risk in the current setup. Three sub-decisions, in
order:

**Namespace parameterization of seed scripts.** Recommended path: `envsubst`
preprocessing. Every seed file today hardcodes `template` as the namespace (via
`USE NS template DB main;` at the top). Change that to
`USE NS ${SURREAL_NS_OVERRIDE:-template} DB main;`, and wrap the seed invocation
in a shell step that runs `envsubst` over each `.surql` before piping it in.
Keeps the source files readable; defaults behave exactly as today when no
override is set.

Alternative considered: in-SurrealQL `LET $ns = ...`. Doesn't help because
`USE NS` can't take a variable. `DEFINE` statements also don't interpolate.
`envsubst` is the mechanical fit.

**globalSetup namespace stamping.** `tests/globalSetup.ts` generates a stamp
like `template_test_20260419_183342_a3b7` at run start, writes it to
`services.namespace`, and invokes the seed pipeline with
`SURREAL_NS_OVERRIDE=<stamp>`. The tricky part: seeding via HTTP, not CLI. The
simplest implementation is a small helper that reads each `.surql` file, applies
envsubst in-process (just a string replace), and POSTs each statement to `/sql`
with the target NS header. About 40 lines of TS.

**globalTeardown drops the namespace.** Simple `REMOVE NAMESPACE {{stamp}}` via
HTTP at suite end. Non-blocking — if teardown fails, log and move on. Stale
namespaces accumulate only if teardowns consistently fail, which itself is a
signal.

**Every spec reads `services.namespace`, not a literal.** Specs already go
through fixtures for their Surreal connections — as long as fixtures default
their client's NS/DB to `services.namespace`, individual specs don't change.
Hurl files need the same treatment: `db/tests/.env` already has `ns=template`,
change it to `ns={{ env "SURREAL_NS_OVERRIDE" "template" }}` (Hurl supports
env-var fallbacks in variable files), and pass `SURREAL_NS_OVERRIDE` through
from the root recipe.

**What you gain:**

- `just test-triangle` twice in a row from warm state works — no leaked
  `user:dupe_*` records clogging the DB.
- Parallel execution of specs becomes safe. Vitest's default thread pool stops
  being a liability.
- You can run two `just test-triangle` processes simultaneously against the same
  SurrealDB container without collision.

**What to watch for:**

- Seed cost per run increases by whatever it takes to seed a fresh namespace
  (~1s probably). Measure before committing to the approach.
- `db/init/05-seed/*.surql` gets a new dependency (the env var); document it in
  `db/tests/README.md`.
- If you also use `just db::run` manually for dev work, the seed still lands in
  `template` by default. The two paths don't collide.

### Track 3 · Request-ID correlation

Not urgent at current size, but cheap and gets harder to retrofit later. Three
layers to touch:

**Engine (Rust).** A `tower` layer that reads `x-request-id` from incoming
requests (or generates a UUIDv7 if absent) and stores it in request-local state.
Every `tracing::info!` / `tracing::error!` span picks it up as a field. When the
engine calls the sidecar, the same ID goes into gRPC metadata under
`x-request-id`. `tower-http::request_id::SetRequestIdLayer` gives you this in
about 5 lines of layer composition.

**RPC (Go).** A unary server interceptor that reads `x-request-id` from incoming
metadata (or generates one), stashes it in the context via a typed key, and
extracts it in every `slog` call as a field. If the sidecar ever calls another
service, it forwards the ID as client metadata. ~30 lines including the context
key plumbing.

**Tests.** In selected e2e specs (start with `smoke.test.ts`'s three existing
scenarios), capture the `x-request-id` header from the first response and assert
that subsequent calls in the same scenario propagate it correctly. This doesn't
require a special assertion helper — just read the header from the response
object.

**What you gain:**

- `grep <request-id> engine.log rpc.log` reassembles a full cross-service trace.
- Debugging "which of my 30 concurrent requests caused this error?" becomes
  mechanical.
- You're one env-var away from OTLP export (`OTEL_EXPORTER_OTLP_ENDPOINT`) if
  you later want real distributed tracing.

**What to watch for:**

- `tower-http`'s request-ID layer vs a manually-written one. The library version
  is fine; don't overengineer.
- Go's context-key patterns. Use the typed-key pattern (unexported
  `type requestIDKey struct{}`), never a string key. Matches the `ctxkeys`
  pattern already in the RPC codebase.
- Don't log the request-ID at `debug` level only. It's metadata, not chatter —
  `info` or as a span field.

### Track 4 · Documentation & TODO discipline

The template doesn't yet explain itself. The tests do — but a human looking at
the repo for the first time needs more than `test-triangle` output to understand
what's going on.

**`README.md` at `tests/` root.** A short page, ideally one screen, that says:
what the three rings are, what tri-path validation is, how to read the
`test-triangle` summary, what color patterns mean which culprits (copy Appendix
B from the wire-validation spec directly), how to add a new test file to each
layer, and the `it.fails` + TODOS.md discipline. This is the onboarding
document; err on the side of clarity over completeness.

**`db/tests/README.md`.** How to write a Hurl file for this project: the
health-check-first rule, the retry options for event-driven capabilities,
randomized suffixes, the `{{ns}}` / `{{db}}` variables. Include one annotated
example file walking through each part.

**`rpc/tests/README.md`.** How the Go inner ring is structured: what `go test`
covers vs what `grpcurl.sh` covers, the JWT claim contract (the single source of
truth for `sub` / `iss` / `aud` / `exp` / `iat`), and how to add a new
smoke-test stanza.

**TODOS.md audit.** A tiny shell script at `scripts/audit-todos.sh` that:

1. Greps `tests/**/*.test.ts` for `it.fails(`, captures the reason-string anchor
   (`TODOS.md#<anchor>`).
2. Greps `tests/TODOS.md` for `##` headings.
3. Compares the two sets; prints the symmetric difference.
4. Exits non-zero if the sets don't match.

About 15 lines of bash. Run from `just quality` (or a new `just audit`). Catches
the discipline drift that's inevitable at human scale.

**What NOT to do here:**

- Don't auto-generate the READMEs from tests. That's a tempting side-quest with
  diminishing returns.
- Don't add a CATALOG.md generator that walks describe/it strings. The TS
  reporter already does that at runtime; a static file would go stale.
- Don't write an architecture doc. The wire-validation spec is already that
  document. Link to it from the READMEs; don't duplicate.

---

## 2. Tracks not currently planned

Some things are conspicuously absent from the four tracks above. They're absent
deliberately — keeping them out keeps the specification honest about what this
work is and isn't.

### 2.1 Things that could be added but shouldn't yet

- **Prometheus / OTLP exporters.** The infrastructure for request-ID (Track 3)
  is 80% of the way to these. But until there's a real observability consumer
  (Grafana, a tracing backend, something), shipping exporters is infrastructure
  for imaginary users. Defer.
- **Streaming RPC tests.** The sidecar doesn't expose streams today. When it
  does, `grpcurl` can handle streaming; a small integration-test Go binary in
  `rpc/tests/` might be cleaner. Not now.
- **Contract snapshot tests** (GraphQL introspection, proto descriptor dumps).
  Real value for a template with external consumers. Low value right now.
  Revisit when someone actually forks this and the contract starts drifting.
- **Performance budgets.** Hurl can assert `duration < N`, `go test` can use
  `testing.B`, Vitest has `.concurrent` and timing hooks. None of this is wrong.
  It's just not the priority when the suite takes 5 seconds total.
- **CI pipeline.** If/when there's a real place for CI to run (GitHub Actions
  for the template itself, or the forker's own CI), the recipes already compose
  correctly: `just quality && just test-triangle` is a complete pre-merge gate.
  Writing the pipeline YAML is glue work, not architecture.

### 2.2 Things that should stay out permanently

- **Fixture-injection migration to `test.extend`.** The closure-based fixtures
  work. Migrating them is busywork disguised as progress. If a genuine need
  arises (e.g., composing fixtures in a way closures can't), reconsider — but
  only then.
- **A custom Vitest reporter.** The default reporter is legible. A custom one is
  a maintenance burden that adds zero information.
- **ESLint / architectural enforcement rules.** Strict-spec discipline from
  humans has worked so far; automating it costs more than it saves at this
  scale.
- **Test-only endpoints** on engine or sidecar. The public-contract-only rule is
  load-bearing for "templates should teach correct patterns."
- **Mocks at service boundaries** in outer-ring tests. Triangulation is the
  mocking strategy. It's better.

---

## 3. Ordering the tracks

Rough sequence, assuming a solo dev pace:

```
Track 1 (close comment_count)       ─┐
  1–2 hours                          │
                                     ▼
Track 4 (minimum: READMEs + audit)  ─┐  ← these two are cheap; do them
  2–4 hours                          │     first so the next person has
                                     │     orientation
                                     ▼
Track 2 (per-run isolation)         ─┐  ← the biggest correctness win;
  1–2 days                           │     requires actual design work
                                     │     on the seed pipeline
                                     ▼
Track 3 (request-ID correlation)    ─┐  ← do last; cheap in isolation
  half a day                         │     but benefits from having
                                     │     isolation already in place
                                     ▼
                                  Done.
```

**Track 1 first** because it closes a visible debt and exercises the TDD loop —
doing it now proves the discipline works end-to-end.

**Track 4 second** because a dense codebase with no onboarding doc is hostile.
Even a one-screen README is a massive improvement over none. Ship it early.

**Track 2 third** because it's the biggest architectural lift. Don't start it
before Track 1 because you want the comment_count fix landing in a clean
namespace model, not after.

**Track 3 last** because it's a nice-to-have that becomes useful once the system
is actually complex enough to have debugging problems. You won't feel the pain
until you're there.

None of this is load-bearing ordering. Any track can be done in any order. These
are recommendations, not constraints.

---

## 4. Things worth thinking about during this work

### 4.1 The suite's growth trajectory

Right now ~45 assertions take 5 seconds. At 10x (450 assertions, which is maybe
one year of template forks and feature additions), running time grows roughly
linearly — call it 50s. Still bearable. At 100x (4,500 assertions), you're at
500s / 8 minutes, and things start to matter:

- Parallelism inside `vp test` becomes mandatory (Track 2 enables this).
- Hurl's `--jobs` flag becomes relevant (currently defaults to 1 for
  determinism).
- The cargo test and go test layers stop being trivially fast.
- The grpcurl smoke script's sequential calls become a bottleneck; it'd need
  rewriting in a proper test framework.

None of these are problems to solve today. They are problems to be aware of when
considering whether to add 50 tests or 500.

### 4.2 The template's audience

A template gets forked by three kinds of people:

1. **People who read the tests first** to understand what the system does. They
   will be served well by the current structure. Make Track 4's READMEs for
   them.
2. **People who run the tests, see them green, and start editing code.** They
   will break things silently if the tests don't cover what they touch.
   Triangulation helps here — a broken wire is almost always caught by at least
   one path. Keep triangulation intact as new features are added.
3. **People who delete the tests because "we'll add our own later."** Nothing to
   be done about them. Don't design for this case.

Every decision about how thorough to make Phase E (and what to do after) is a
decision about which of these three audiences you're serving. The
recommendations above assume audience #1 and #2 in roughly equal measure.

### 4.3 When the spec stops being right

Specs age. This one will too. Specific signals that this specification has
stopped being right:

- **The failure-pattern table (Appendix B of the wire-validation spec) gives
  wrong answers.** Means a path has been added or removed without updating the
  table. Fix the table or fix the paths.
- **`it.fails` count > 3.** Means wire debt is accumulating faster than it's
  being paid down. Stop and close gaps before adding more.
- **`just test-triangle` takes more than 30s.** Means the suite has outgrown the
  one-shot model; it's time to introduce `test-triangle-fast` vs
  `test-triangle-full` or similar tiering.
- **A test becomes flaky "sometimes."** Means state isolation is broken. Fix
  Track 2 if you haven't; double-check it if you have.
- **Someone asks "where does this get tested?" and the answer isn't obvious.**
  Means the capability-organization story has drifted from the filesystem. The
  fix is capability-first filenames, not reorganization.

### 4.4 The one thing not to break

The `it.fails` + TODOS.md discipline is the keystone of the whole setup.
Everything else is mechanism; that's the actual engineering culture being
encoded. If it erodes — if people start using `it.skip` instead, or leaving
`it.fails` without TODOS entries, or deleting `it.fails` to clean up red output
— the whole tri-path advantage evaporates because you lose the signal that
separates "something broke" from "something's known broken."

When reviewing future test changes (yours or someone else's), the two questions
are always:

1. Is this test red for a known reason (`it.fails` + TODOS entry)?
2. Is this test green because the wire works, or green because someone
   mocked/skipped the assertion?

If either answer is uncomfortable, fix it before merging.

---

## 5. Summary for tomorrow-morning-you

You finished Phases A–D. The suite does what it was supposed to do.

**Next 1 hour:** Fix `comment_count` via schema DEFAULT. Delete the `it.fails`
and the TODOS entry. Confirm green.

**Next 4 hours:** Write `tests/README.md`, `db/tests/README.md`,
`rpc/tests/README.md`. Write `scripts/audit-todos.sh`. Run it; confirm zero
drift.

**Next 1–2 days (when you have a focused block):** Namespace stamping. Design
the `envsubst` seed pipeline; test it standalone; integrate into
`globalSetup`/`globalTeardown`; verify `just test-triangle` twice in a row is
green.

**When you feel like it:** Request-ID propagation. It's not urgent. It'll feel
like a quality-of-life improvement the day you need to debug a cross-service
issue.

**What not to do:** Don't add exporters, streaming tests, or a CI pipeline until
there's a real reason to. Don't migrate fixtures to `test.extend`. Don't write
ESLint rules. Don't build infrastructure for imaginary users.

The template is a good template. Finish these four tracks and it's a template
worth forking.
