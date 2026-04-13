#!/usr/bin/env bash
# =============================================================================
# GROUP F — Full-text search
# GROUP G — Reference integrity (ON DELETE REJECT)
# GROUP H — Seed data verification
# =============================================================================

# ── GROUP F — Full-text search ────────────────────────────────────────────────

# F1: title search (Item)
RES=$(run_query "SELECT title FROM item WHERE title @@ 'Generic';")
if echo "$RES" | grep -qi 'Generic Product Item'; then
    pass "F1 · Full-text search on title: 'Generic' hits"
else
    fail "F1 · Full-text search for 'Generic' should return Item" "$RES"
fi

# ── GROUP H — Seed data verification ─────────────────────────────────────────

# H1: user count
RES=$(run_query "SELECT count() FROM user GROUP ALL;")
if echo "$RES" | grep -qE '"count":'; then
    pass "H1 · Users present"
else
    fail "H1 · Expected users table to be populated" "$RES"
fi

# H2: item count
RES=$(run_query "SELECT count() FROM item GROUP ALL;")
if echo "$RES" | grep -qE '"count":'; then
    pass "H2 · Items present"
else
    fail "H2 · Expected items table to be populated" "$RES"
fi
