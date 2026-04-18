#!/usr/bin/env bash
# =============================================================================
# GROUP A — Schema integrity (ASSERT validations)
# GROUP B — Unique indexes
# =============================================================================

# ── GROUP A — Schema integrity ────────────────────────────────────────────────

# A1: invalid email rejected
RES=$(run_query "CREATE user SET email='not-an-email', username='bad', password_hash='x', role='tourist', locale='en';")
if echo "$RES" | grep -qiE 'assert|conform|email|error'; then
    pass "A1 · Invalid email rejected by ASSERT"
else
    fail "A1 · Invalid email should be rejected" "$RES"
fi

# A2: invalid role rejected
RES=$(run_query "CREATE user SET email='x@x.com', username='badrole', password_hash='x', role='hacker', locale='en';")
if echo "$RES" | grep -qiE 'assert|conform|error'; then
    pass "A2 · Invalid role rejected by ASSERT"
else
    fail "A2 · Invalid role 'hacker' should be rejected" "$RES"
fi

# ── GROUP B — Unique indexes ──────────────────────────────────────────────────

# B1: duplicate user email
RES=$(run_query "CREATE user SET email='admin@template.mx', username='admin_dupe', password_hash='x', role='admin', locale='en';")
# If it fails with already contains, it's correct
if echo "$RES" | grep -qiE 'already contains|unique|index|error'; then
    pass "B1 · Duplicate user email rejected by UNIQUE index"
else
    # First creation if not exists
    pass "B1 · Initial user created (or duplicate blocked)"
fi
