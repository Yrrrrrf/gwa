# Wire Gap Tracker

Every `it.fails(reason)` in the test suite MUST have a corresponding entry here.
When the implementation is fixed, the test flips red (because `it.fails` now sees
a passing test). Delete the `.fails` marker and remove the entry below.

---

## engine-create-comment-count

**Error:** `Couldn't coerce value for field 'comment_count' ... Expected 'int' but found 'NULL'`

**Affected test:** `tests/integration/engine/items.test.ts` — "expected to fail until engine sets comment_count=0 on create"

**Root cause:** The `item` table defines `DEFINE FIELD comment_count ON item TYPE int` without a `DEFAULT 0`. The engine's `createItem` mutation doesn't explicitly set `comment_count`, so SurrealDB receives NULL for a non-nullable int field. The error surfaces when a post-create event tries to write to the field.

**Recommended fix:** Add `DEFAULT 0` to the field definition in the SurrealDB schema:

```surql
DEFINE FIELD comment_count ON item TYPE int DEFAULT 0;
```

**Fix location:** `db/init/` schema file (preferred) or `engine/core/store/src/repos/item.rs`

**Decision:** The invariant belongs to the data, not to one consumer. Fix via DB schema `DEFAULT 0` (see spec §9.1 Q1).
