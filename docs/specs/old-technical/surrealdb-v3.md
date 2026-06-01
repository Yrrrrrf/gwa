# SurrealDB v3 — Practical Reference & Lessons Learned

> Based on the Chimera real-estate platform migration from Supabase/PostgreSQL → SurrealDB v3.0.2  
> Every section is grounded in errors we actually hit during implementation.

---

## 1. Core Mental Model

SurrealDB v3 is **not a relational database with a graph plugin**. It is a multi-paradigm database where:

- **Tables** hold records (like SQL)
- **Graph edges** replace junction tables (`RELATE`)
- **Computed fields** replace triggers, views, and generated columns
- **Events** replace stored procedures and triggers
- **Auth** (`DEFINE ACCESS`) replaces external services like GoTrue
- **`PERMISSIONS`** on each table replaces API gateway layers (PostgREST schemas, RLS policies)

If you try to map it 1-to-1 onto a relational model you will fight the tool. Lean into the primitives.

---

## 2. Key v3 Syntax Changes from v2

### 2.1 `COMPUTED` replaces `future` types

```surql
-- ❌ v2 "future" syntax — REMOVED in v3
DEFINE FIELD total_value ON item VALUE <future> { quantity * price };

-- ✅ v3 correct
DEFINE FIELD total_value ON item COMPUTED quantity * price;
```

A `COMPUTED` field is **never stored** — it is evaluated every time it is accessed.  
Constraints:
- Cannot be defined on the `id` field
- Cannot be defined on nested fields (e.g. `metadata.sub_field`)
- Only supports a single expression — no multi-statement blocks

### 2.2 `IF / ELSE` uses curly braces, not `THEN / END`

```surql
-- ❌ v2 syntax — deprecated in v3
IF $x > 0 THEN
    RETURN 'positive';
ELSE
    RETURN 'zero or negative';
END;

-- ✅ v3 correct
IF $x > 0 {
    RETURN 'positive';
} ELSE {
    RETURN 'zero or negative';
};
```

### 2.3 `DEFINE ACCESS` replaces `DEFINE SCOPE`

```surql
-- ❌ v2 — DEFINE SCOPE is gone
DEFINE SCOPE user_scope SESSION 1d
    SIGNUP ( CREATE user SET ... )
    SIGNIN ( SELECT * FROM user WHERE ... );

-- ✅ v3 correct
DEFINE ACCESS user_auth ON DATABASE TYPE RECORD
    SIGNUP ( CREATE user SET email = $email, password = crypto::argon2::generate($password) )
    SIGNIN ( SELECT * FROM user WHERE email = $email AND crypto::argon2::compare(password, $password) )
    DURATION FOR SESSION 1w, FOR TOKEN 15m;
```

### 2.4 `REFERENCE` with `ON DELETE` actions

v3 introduces proper referential integrity on record links:

```surql
DEFINE FIELD owner ON property TYPE record<user>
    REFERENCE ON DELETE REJECT;   -- blocks deletion if referenced
    -- or ON DELETE CASCADE        -- deletes this record too
    -- or ON DELETE UNSET          -- sets field to NONE
    -- or ON DELETE IGNORE         -- does nothing (default)
    -- or ON DELETE THEN { ... }   -- custom expression
```

---

## 3. Errors We Hit — and How to Fix Them

### ❌ Error 1 — `ON DELETE RESTRICT` is not valid

```
Parse error: Unexpected token `an identifier`, expected `REJECT`, `CASCADE`, `IGNORE`, `UNSET` or `THEN`
--> REFERENCE ON DELETE RESTRICT;
```

**Cause:** `RESTRICT` is a PostgreSQL keyword. SurrealDB v3 uses different vocabulary.

**Fix:**

| PostgreSQL | SurrealDB v3 |
|---|---|
| `ON DELETE RESTRICT` | `REFERENCE ON DELETE REJECT` |
| `ON DELETE SET NULL` | `REFERENCE ON DELETE UNSET` |
| `ON DELETE CASCADE` | `REFERENCE ON DELETE CASCADE` |
| `ON DELETE NO ACTION` | `REFERENCE ON DELETE IGNORE` |

---

### ❌ Error 2 — `ORDER BY` inside `SELECT VALUE` subquery

```
Parse error: Missing order idiom `valid_from` in statement selection
--> ORDER BY valid_from DESC LIMIT 1)[0] ?? NONE;
```

**Cause:** When using `SELECT VALUE <single_field>`, you can only `ORDER BY` a field that is part of the selection. `valid_from` wasn't in `SELECT VALUE rate`.

**Option A — Add the field to the selection:**
```surql
-- Select both, then extract .rate
(SELECT rate, valid_from FROM exchange_rate ORDER BY valid_from DESC LIMIT 1)[0].rate
```

**Option B — Drop `ORDER BY` if a unique index guarantees one row:**
```surql
-- If (currency_from, currency_to) is UNIQUE, LIMIT 1 is enough
(SELECT VALUE rate FROM exchange_rate WHERE currency_from = 'MXN' AND currency_to = 'USD' LIMIT 1)[0]
```

> **Lesson:** Avoid `ORDER BY` inside `COMPUTED` field subqueries if possible — SurrealDB has restrictions on what idioms are in scope. Prefer unique indexes so ordering is unnecessary.

---

### ❌ Error 3 — `??` does not catch runtime multiplication errors

```
Cannot perform multiplication with '18500000dec' and 'NONE'
```

**Cause:** `??` is a null-coalescing operator, not an error handler. The expression:
```surql
price * subquery[0] ?? NONE
```
is parsed as:
```surql
(price * subquery[0]) ?? NONE
```
When `subquery[0]` is `NONE`, `price * NONE` **throws a runtime error** before `??` ever runs.

**Fix — use `IF` to guard the multiplication:**
```surql
-- ❌ Wrong — multiplication happens before ??
DEFINE FIELD price_usd ON property COMPUTED
    price * (SELECT VALUE rate FROM exchange_rate LIMIT 1)[0] ?? NONE;

-- ✅ Correct — IF prevents multiplication when rate is NONE
DEFINE FIELD price_usd ON property COMPUTED
    IF (SELECT VALUE rate FROM exchange_rate
            WHERE currency_from = $parent.currency AND currency_to = 'USD'
            LIMIT 1)[0] != NONE {
        price * (SELECT VALUE rate FROM exchange_rate
                 WHERE currency_from = $parent.currency AND currency_to = 'USD'
                 LIMIT 1)[0]
    } ELSE { NONE };
```

> **Lesson:** Never rely on `??` to catch errors from arithmetic on `NONE`. Always guard with `IF … != NONE` first.

---

### ❌ Error 4 — Reserved keywords as field names (`from`, `to`)

```
Cannot perform multiplication with '18500000dec' and 'NONE'
-- (subquery silently returns empty because WHERE from = ... fails to parse as intended)
```

**Cause:** `from` and `to` are reserved SurrealQL keywords (used in `FROM table`, `TO edge`). Defining fields named `from` or `to` on a SCHEMAFULL table and then querying `WHERE from = 'MXN'` silently misbehaves — the parser doesn't match the field name.

**Fix — rename to avoid reserved words:**
```surql
-- ❌ Dangerous field names
DEFINE FIELD from ON exchange_rate TYPE string;
DEFINE FIELD to   ON exchange_rate TYPE string;

-- ✅ Safe names
DEFINE FIELD currency_from ON exchange_rate TYPE string;
DEFINE FIELD currency_to   ON exchange_rate TYPE string;
```

Other reserved words to avoid as field names: `id`, `in`, `out`, `type`, `return`, `select`, `where`, `limit`, `order`, `group`, `fetch`, `start`.

---

### ❌ Error 5 — `RELATE` does not accept array indexing in subject position

```
Parse error: Unexpected token `[`, expected a relation arrow
--> RELATE $new_lead[0].id->inquired->$after.property;
```

**Cause:** The `RELATE` statement requires plain record IDs on both sides of the arrows. Array subscript expressions (`[0]`) are not valid there.

**Fix — extract into a `LET` first:**
```surql
-- ❌ Wrong
RELATE $new_lead[0].id->inquired->$after.property;

-- ✅ Correct
LET $lead_id = $new_lead[0].id;
RELATE $lead_id->inquired->$after.property;
```

---

### ❌ Error 6 — `SCHEMAFULL` requires nested object fields to be declared

```
Found field 'images[0].display_order', but no such field exists for table 'property'
```

**Cause:** On a `SCHEMAFULL` table, **every** field — including sub-fields inside `array<object>` — must be explicitly declared with `DEFINE FIELD`. Defining just the parent `images ON property TYPE array<object>` is not enough.

**Fix — use `[*]` wildcard to define all sub-fields:**
```surql
-- Parent array
DEFINE FIELD images ON property TYPE array<object> DEFAULT [];

-- Every sub-field, each declared separately
DEFINE FIELD images[*].url           ON property TYPE string;
DEFINE FIELD images[*].thumbnail_url ON property TYPE option<string>;
DEFINE FIELD images[*].is_cover      ON property TYPE bool DEFAULT false;
DEFINE FIELD images[*].display_order ON property TYPE int  DEFAULT 0;
DEFINE FIELD images[*].type          ON property TYPE option<string>;
DEFINE FIELD images[*].filename      ON property TYPE option<string>;
DEFINE FIELD images[*].mime_type     ON property TYPE option<string>;
```

Same pattern applies to any `array<object>` field: `price_history[*]`, `notes[*]`, etc.

---

### ❌ Error 7 — Datetime strings inside object literals need `d''` prefix

```
Couldn't coerce value for field `notes.*.at` of `lead:lead1`:
Expected `none | datetime` but found `'2026-01-15T10:00:00Z'`
```

**Cause:** Inside an object literal `{ key: value }`, a plain string `'2026-01-15T10:00:00Z'` is treated as `string`, not `datetime` — even if the field schema declares `TYPE datetime`. SurrealDB requires an explicit datetime literal.

**Fix — prefix datetime strings with `d`:**
```surql
-- ❌ Plain string — fails schema coercion inside objects
notes = [{ text: 'Hello', at: '2026-01-15T10:00:00Z' }];

-- ✅ Datetime literal
notes = [{ text: 'Hello', at: d'2026-01-15T10:00:00Z' }];
```

Other typed literals in SurrealDB:

| Type | Literal syntax |
|---|---|
| `datetime` | `d'2026-01-15T10:00:00Z'` |
| `decimal` | `42.5dec` |
| `duration` | `1d`, `2h30m`, `1w` |
| `record` | `table:id` (e.g. `user:admin1`) |
| `geometry` | `{ type: 'Point', coordinates: [...] }` |

---

## 4. Docker / Build Gotcha — Seed is Baked into the Image

If your `db.Dockerfile` uses `COPY seed.surql /seed.surql`, editing the file on disk **has no effect** until you rebuild the image:

```dockerfile
COPY seed.surql /seed.surql   # baked at build time — not a live mount
```

**Workflow to apply seed changes:**
```bash
# Full clean rebuild (drop old volume too)
docker compose down -v
docker compose build --no-cache
docker compose up
```

> If you want hot-reload during development, mount the file instead:
> ```yaml
> volumes:
>   - ./seed.surql:/seed.surql   # live mount — changes reflected without rebuild
> ```

---

## 5. Quick Reference — v3 Cheat Sheet

### Table definition
```surql
DEFINE TABLE my_table SCHEMAFULL
    PERMISSIONS
        FOR select FULL
        FOR create, update WHERE $auth.role IN ['admin', 'agent']
        FOR delete WHERE $auth.role = 'admin';
```

### Field types
```surql
DEFINE FIELD name     ON t TYPE string;
DEFINE FIELD age      ON t TYPE int ASSERT $value >= 0;
DEFINE FIELD bio      ON t TYPE option<string>;            -- nullable
DEFINE FIELD role     ON t TYPE string ASSERT $value IN ['a', 'b'];
DEFINE FIELD tags     ON t TYPE array<string> DEFAULT [];
DEFINE FIELD meta     ON t TYPE option<object>;
DEFINE FIELD ref      ON t TYPE record<other_table> REFERENCE ON DELETE REJECT;
DEFINE FIELD computed ON t COMPUTED some_field * 2;        -- not stored
DEFINE FIELD created  ON t TYPE datetime DEFAULT time::now();
```

### Graph edges
```surql
-- Create edge
RELATE user:alice->follows->user:bob SET followed_at = time::now();

-- Forward traversal
SELECT ->follows->user.name AS following FROM user:alice;

-- Reverse traversal
SELECT <-follows<-user.name AS followers FROM user:bob;

-- Edge with metadata
SELECT ->follows.followed_at AS dates FROM user:alice;
```

### Events
```surql
-- Curly-brace body (multi-statement)
DEFINE EVENT on_create ON my_table WHEN $event = 'CREATE' THEN {
    LET $x = $after.some_field;
    IF $x > 0 {
        CREATE log SET msg = 'positive';
    };
};

-- Parenthesis body (single statement)
DEFINE EVENT on_update ON my_table
    WHEN $event = 'UPDATE' AND $before.status != $after.status THEN (
        UPDATE my_table SET updated_at = time::now() WHERE id = $after.id
    );
```

### Indexes
```surql
DEFINE INDEX idx_unique  ON table FIELDS field UNIQUE;
DEFINE INDEX idx_spatial ON table FIELDS location;          -- geo
DEFINE INDEX idx_ft      ON table FIELDS body
    FULLTEXT ANALYZER my_analyzer BM25;                     -- full-text
```

### Full-text analyzer
```surql
DEFINE ANALYZER my_analyzer
    TOKENIZERS blank, class, camel, punct
    FILTERS ascii, lowercase, snowball(spanish);
```

### Auth
```surql
DEFINE ACCESS record_auth ON DATABASE TYPE RECORD
    SIGNUP ( CREATE user SET email = $email, password = crypto::argon2::generate($password) )
    SIGNIN ( SELECT * FROM user WHERE email = $email AND crypto::argon2::compare(password, $password) )
    DURATION FOR SESSION 1w, FOR TOKEN 15m;
```

---

## 6. Architecture Score — Postgres vs SurrealDB v3 (Chimera)

| Concern | PostgreSQL + PostgREST | SurrealDB v3 |
|---|---|---|
| Tables | 25+ | 11 |
| API views | 9 (api schema) | 0 — `PERMISSIONS` is the API |
| Junction tables | 6 | 0 — graph edges |
| Triggers | 8 | 5 `DEFINE EVENT` |
| Auth service | GoTrue (external) | `DEFINE ACCESS` (built-in) |
| Full-text search | GIN + tsvector (3 migrations) | 1 `DEFINE ANALYZER` + 2 indexes |
| Geo region assignment | 1 trigger + 1 function | 1 `COMPUTED` field |
| Real-time | Supabase Realtime (separate service) | `LIVE SELECT` (built-in WebSocket) |
| Migration files | 19 | 1 `seed.surql` |
