# DB Inner Ring — Hurl Tests

These tests exercise the SurrealDB HTTP contract directly via `POST /sql`,
**without any SDK**. They form the inner ring of the tri-path validation model:
when a Hurl test passes but the TS SDK outer-ring test fails, the fault is in
the SDK adapter — not in the DB schema.

## Running

```bash
# All tests
just db::test

# Single test (verbose debug output)
just db::test-one schema-email.hurl

# HTML report
just db::test-report    # → db/tests/out/report/
```

## Conventions

- **One capability per file.** Filename = capability.
- **Health check first.** Every file starts with `GET /health → HTTP 200`.
- **Randomized IDs.** Records created by tests use file-specific prefixes (e.g.,
  `hurl_email_`) to avoid collisions with seed data.
- **Retry for events.** Assertions on event-driven fields (activity creation,
  computed stats) use `[Options] retry: 5` / `retry-interval: 200` instead of
  imperative delays.
- **Cleanup.** Every file deletes the records it created in a final request
  block.
- **Seed data.** Read-only references to seed records (`user:alice`,
  `item:hiking_boots`, etc.) are permitted. See `db/init/05-seed/` for fixture
  IDs.

## Variables (`.env`)

| Variable   | Value                   | Used for            |
| ---------- | ----------------------- | ------------------- |
| `ns`       | `template`              | `Surreal-NS` header |
| `db`       | `main`                  | `Surreal-DB` header |
| `base_url` | `http://localhost:8000` | All request URLs    |
