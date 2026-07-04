# GWA Template — Enhanced Database Blueprint

The **what-to-build** for the next-generation *General Web App* template: a single, project-agnostic SurrealDB database whose only job is to **showcase every pattern worth having**, so it can be specialised into any real product by adding a thin domain layer on top.

> **Targets** SurrealDB v3 (3.1+). **Reads alongside** `surql-manifest.md` (the rules — MUST/MUST NOT) and `surql-skill.md` (the syntax — copy-ready code). This file is **zero-code on purpose**: it lists *what* must exist and *which pattern each piece proves*; the model pulls the *how* from the skill and validates against the manifest.

---

## 1. Purpose & the agnostic principle

The template has **one polymorphic content entity — `item`** — surrounded by the generic machinery every web app needs (identity, taxonomy, social graph, media, search, i18n, audit, notifications). It is deliberately domain-free: in a real project you **rename/extend `item`** (→ `product`, `post`, `listing`, `property`, `course`…) and bolt on domain-specific edges and fields. Nothing here assumes a vertical. The win: one battle-tested, manifest-conformant core that already demonstrates the "god way" to use SurrealQL, ready to specialise.

## 2. How the three documents combine

1. **Manifest** decides every contested choice (link vs edge, computed vs event, schemafull tiers, auth model, deploy posture) and forbids the SQL-shaped reflexes.
2. **Skill** supplies the exact v3 syntax for each construct the blueprint names.
3. **Blueprint (this file)** enumerates the concrete tables, edges, fields, functions, events, indexes, and the build order — each tagged with the feature it proves.

A model given all three can build or upgrade the template end-to-end and self-check it.

---

## 3. Feature coverage matrix — the full set the upgrade must hit

Every row is a SurrealQL capability the enhanced template **must demonstrate**, where it lives, and the reference sections.

| # | Feature / pattern | Where it lives in GWA | Manifest | Skill |
|---|---|---|---|---|
| 1 | Native record IDs (no UUID columns) | every table | §4.1 | §2 |
| 2 | `SCHEMAFULL` + strictness tiers | every table | §3 | §3–4 |
| 3 | Typed-flexible payload (literal union / `field.*`) | `activity.meta` | §3.2 | §4 |
| 4 | Enum via `ASSERT … IN` | `user.role`, `item.status`, `reaction.kind`, `view.source` | §5.1 | §4 |
| 5 | Array-element `ASSERT` via closure | `item.languages` | §5.1 | §4, §23 |
| 6 | `option<T>` nullability | profile/optional fields | §5.2 | §4 |
| 7 | `READONLY` immutables | `created_at`, snapshot fields | §5.3 | §4 |
| 8 | Auto-maintained timestamps | `created_at` + `updated_at` everywhere | §5.4 | §4 |
| 9 | Sequences for human codes | `item.code` | §4.3 | §10 |
| 10 | Record links + explicit `REFERENCE ON DELETE` | `item.author`, `item.category`, `media.item` | §6.1, §6.4 | §7a |
| 11 | Array of links | `item.tags` | §6.2 | §7b |
| 12 | Typed graph edges (`TYPE RELATION`) | `comment`, `reaction`, `follows`, `view`, `bookmark` | §6.3 | §7c |
| 13 | Edge uniqueness (`UNIQUE in, out`) | `reaction`, `bookmark` | §6.3 | §5, §7c |
| 14 | Self-ref hierarchy + materialized path | `category.parent` + `category.path` (`VALUE`) | §6.5 | §7e |
| 15 | Graph traversal + recommendation | `fn::recommend` | — | §7d |
| 16 | Intra-record `COMPUTED` | `item.display_title` | §7.1 | §4, §12 |
| 17 | Event counter (increment) | `item.comment_count`, `like_count`, `view_count` | §7.2 | §8, §12 |
| 18 | Event average (recompute via `GROUP ALL`) | `item.rating` | §7.2 | §8 |
| 19 | Snapshot-at-write | `activity.meta` (+ a pinned snapshot field) | §7.3 | §12 |
| 20 | Pre-computed auto-updating view | `items_by_category` | §11.1 | §3 |
| 21 | Query-time aggregate function | `fn::trending` | §7.3, §11.2 | §12 |
| 22 | Full-text BM25 + custom analyzer | `item.title`/`body` + `fn::search` | §10.1 | §6, §14 |
| 23 | Geospatial radius search | `item.location` + `fn::near` | §4.2 | §22 |
| 24 | Internationalization | `locale_string` + `fn::t` + `*.locale` | §5.5 | §21 |
| 25 | Record-access auth + `WITH REFRESH` + `AUTHENTICATE` | `DEFINE ACCESS user_auth` | §9.1–9.6 | §11a |
| 26 | System users (RBAC) | `DEFINE USER` (admin/service) | §9.3 | §11b |
| 27 | Row + field permissions | `item`, `user`, `internal_notes` | §9.7 | §11c |
| 28 | Guest read surface + capability posture | deploy config | §9, §14 | §20 |
| 29 | Live queries (realtime) | `notification` | §10.3 | §15 |
| 30 | Audit log written only by events | `activity` | §8 | §8 |
| 31 | Idempotent definitions | every `DEFINE` (`OVERWRITE`/`IF NOT EXISTS`) | §12 | §17 |
| 32 | HTTP `/sql` contract + retry-based tests | test suite | §13, §15 | §19 |
| 33 | Transactions for guarded multi-write | seed + `fn::` mutations | — | §16 |

**Acceptance rule:** the upgrade is "done" only when **every row above is present and exercised by a test.**

---

## 4. Entity inventory (tables)

Generic, domain-free. Each line notes the patterns it carries.

- **`user`** — identity & profile. `username`/`email` unique; `role` enum (`ASSERT IN`); `locale` (`DEFAULT 'en'`); `display_name`/`avatar`/`bio` as `option`; `created_at`/`updated_at` auto; `internal_notes` field-permissioned. *No auth columns beyond what record access needs; no `session` table.*
- **`item`** — the polymorphic core. `code` (sequence); `slug` unique; `title`/`body` (FTS); `status` enum; `author` (link→user); `category` (link→category); `tags` (`array<record<tag>>`); `location` (`geometry<point>`); `languages` (`array<string>`, closure-asserted); `display_title` (`COMPUTED`); `rating`/`comment_count`/`like_count`/`view_count` (event-maintained); `is_active`/`is_published` flags; timestamps.
- **`category`** — taxonomy. `slug` unique; `parent` (`option<record<category>>`); `path` (`VALUE`, materialized breadcrumb).
- **`tag`** — label. `slug` unique; `name`.
- **`media`** — external asset. `item` (link→item, `ON DELETE CASCADE`); `url`; `sort_order`; localized `caption` strategy via `locale_string` keys.
- **`locale_string`** — i18n store. `key` + `locale` + `value`; `UNIQUE(key, locale)`.
- **`activity`** — append-only audit log, written **only by events**. `type`; `actor` (link→user, optional); `target` (link, optional); `meta` (typed-flexible); `occurred_at`.
- **`notification`** — realtime feed. `recipient` (link→user); `kind` enum; `payload` (typed); `read` (bool); `created_at`. Subscribed via `LIVE SELECT`.

## 5. Edge inventory (relations)

All `SCHEMAFULL TYPE RELATION IN … OUT …`. Authorship is a **link** (1:N), not an edge — the social/behavioral relationships are edges.

- **`comment`** — `user → item`. `body`; optional `rating` (1–5); `created_at`. (Feeds `item.comment_count` and `item.rating`.)
- **`reaction`** — `user → item`. `kind` enum (`like`/…); `UNIQUE(in, out)` (one reaction per pair). (Feeds `item.like_count`.)
- **`view`** — `user → item`. `source` enum; `at`. Behavioral fact feeding analytics + `fn::recommend`; index `out`.
- **`bookmark`** — `user → item`. `added_at`; `UNIQUE(in, out)`.
- **`follows`** — `user → user`. `since`. Social graph for feeds/recommendations.

## 6. Derived-data plan (proves the whole decision tree)

- **Intra-record → `COMPUTED`:** `item.display_title`.
- **Counter → event increment:** `item.comment_count`, `item.like_count`, `item.view_count` (`+= 1` / `-= 1` on edge create/delete).
- **Average → event recompute:** `item.rating` (`SELECT math::mean(rating) … GROUP ALL` on `comment` create/delete).
- **Snapshot-at-write:** `activity.meta` captures the relevant state at the moment of the logged action; add one explicit pinned field (e.g. a stored `author_locale_at_create`) to demonstrate the pattern distinct from `COMPUTED`.
- **Auto-updating view:** `items_by_category` (`DEFINE TABLE … AS SELECT count() … GROUP BY category`).
- **Query-time aggregate:** `fn::trending` (engagement score, computed on read, never stored).

## 7. Functions (`fn::`) inventory

- `fn::t($key, $locale)` — i18n resolver with default-locale fallback.
- `fn::search($query, $locale, $category?, $tag?)` — BM25 `@@` search with optional-filter idiom.
- `fn::near($point, $radius_km)` — geo radius search, distance-augmented, nearest-first.
- `fn::recommend($user, $limit)` — graph collaborative filtering (`view` out → similar users back → aggregate overlap).
- `fn::trending($limit)` — query-time engagement ranking.
- `fn::react($user, $item, $kind)` — guarded mutation; uniqueness enforced by the `reaction` index, not an app check.

## 8. Events inventory

- `comment` create/delete → maintain `item.comment_count` (increment) **and** `item.rating` (recompute) + write `activity`.
- `reaction` create/delete → maintain `item.like_count`; first reaction → `notification` to `item.author`.
- `view` create → maintain `item.view_count`; first view → `activity`.
- `item` update (publish transition) → `notification` + `activity`.
- All bodies may be inline blocks; none updates its own table; `updated_at` folded into the triggering write.

## 9. Indexes inventory

- **Unique:** `user.email`, `user.username`, `item.slug`, `category.slug`, `tag.slug`, `locale_string(key, locale)`, `reaction(in, out)`, `bookmark(in, out)`.
- **Full-text:** `item.title` and `item.body` (separate BM25 indexes, `ascii`+`lowercase`+`snowball` analyzer).
- **Geo:** `item.location`.
- **Analytics:** `view.out`, `reaction.out`, `activity.occurred_at`, `item.category`.

## 10. Auth & security layer

- **`DEFINE ACCESS user_auth TYPE RECORD`** — `SIGNUP`/`SIGNIN` with `crypto::argon2`, `AUTHENTICATE` (suspended/role check), `WITH REFRESH`, `DURATION FOR TOKEN 15m, FOR SESSION 12h`. No session table.
- **`DEFINE USER`** — a system `admin` (RBAC) for operations, distinct from record users.
- **Permissions** — ownership via `item.author = $auth.id`; published-or-owner read; field-level lock on `internal_notes`; a seeded read-only `guest` for the public surface.
- **2FA / password-reset** — explicitly **deferred** (documented stub fields only), per manifest §9.5.
- **Capability posture** — documented `--deny-all` + allowed function families + `--allow-guests` for the public read surface.

## 11. Realtime & search surfaces

- **Realtime:** `LIVE SELECT * FROM notification WHERE recipient = $auth.id AND read = false`.
- **Search:** `fn::search` over the BM25 indexes with `search::score`/`search::highlight`.
- **Geo:** `fn::near` for "things around me".
- **Graph:** `fn::recommend` for "items for you".

---

## 12. Build todo-list (pipeline-ordered checklist)

Follow the canonical order; each `DEFINE` uses `OVERWRITE`/`IF NOT EXISTS`.

**Phase 1 — `01-schema/01-tables`** → verify: every table from §4–5 created `SCHEMAFULL` with explicit `PERMISSIONS`; namespace+database set.
- [ ] 8 entity tables + 5 relation tables defined.

**Phase 2 — `01-schema/02-fields`** → verify: every field from §4–6 with correct type, `ASSERT`, `DEFAULT`/`VALUE`, `READONLY`, `REFERENCE ON DELETE`.
- [ ] enums asserted, closure-asserted array, timestamps auto, links with referential actions, `category.path` VALUE, `item.display_title` COMPUTED, counter/rating fields seeded to defaults.

**Phase 3 — `02-indexes`** → verify: all uniques, both FTS indexes (+ analyzer), geo index, analytics indexes from §9.
- [ ] `DEFINE ANALYZER` + 2 `FULLTEXT … BM25` + geo + edge uniques.

**Phase 4 — `03-functions`** → verify: all six `fn::` from §7 defined and individually callable.

**Phase 5 — `04-events`** → verify: all events from §8; counters increment, rating recomputes, audit + notifications fire; no self-retrigger.

**Phase 6 — `04-events` (views)** → verify: `items_by_category` auto-updating view returns correct aggregates after writes.

**Phase 7 — `05-seed`** → verify (with dependency-ordered files): locale strings → categories (parent before child) → tags → users → items (sequence codes assigned) → media → graph edges (comment/reaction/view/bookmark/follows) → derived values populated by events. Use a transaction for any multi-write guarded seed.

**Phase 8 — auth + capabilities** → verify: `DEFINE ACCESS` signup/signin round-trips over HTTP, refresh issued; system `admin` exists; guest read-only works; capabilities config documented.

**Phase 9 — tests** (`/sql` over HTTP, retry not sleep) → verify: one test per matrix row (§3).

## 13. Acceptance / fitness criteria

The upgrade passes only when **all** hold:
1. **Coverage:** every §3 row is present and has a passing test.
2. **Lint (manifest §20.2):** zero forbidden reflexes — no UUID columns, no `DEFINE SCOPE/TOKEN`, no session table, no default-schemaless, no `FLEXIBLE`/`any`/untyped object, no sub-query in `COMPUTED`, no `SEARCH ANALYZER`, no default `ON DELETE IGNORE`, no junction table, no self-retriggering event.
3. **Engine (manifest §20.1):** boots under `--deny-all` + the declared allow-list; permissions enforce ownership; asserts and unique indexes reject bad writes.
4. **Idempotency:** re-running the full pipeline converges with no errors.

## 14. Specialising the template for a real business

The abstraction layer, kept thin:
- **Rename/extend `item`** into the domain entity; keep its machinery (slug, code, FTS, geo, counters, status).
- **Add domain edges** (e.g. `enrolled_in`, `booked`, `purchased`) following the link-vs-edge rule.
- **Add domain enums/asserts** and any domain `fn::`; reuse `fn::search`/`near`/`recommend` unchanged.
- **Localize** new strings through `locale_string` (never new per-language columns).
- **Keep** auth, permissions, audit, notifications, capabilities as-is — they're domain-neutral.
- **Re-run** the fitness checks (§13) against the specialised schema.

## 15. Scope

- **In:** everything in the matrix (§3) — the showcase set.
- **Out (noted for later):** vector/ANN search (HNSW/DiskANN), file buckets, `DEFINE API` custom endpoints, GraphQL surface, WASM modules, multi-tenant sharding. Each can be layered on without disturbing the core.
