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

# A3: negative rating rejected on review
RES=$(run_query "RELATE user:tourist_akiko->review->business:tacos_el_memo SET rating=-1, locale='ja';")
if echo "$RES" | grep -qiE 'assert|conform|error'; then
    pass "A3 · Negative rating rejected by ASSERT"
else
    fail "A3 · Negative rating should be rejected" "$RES"
fi

# A4: invalid price_range rejected
RES=$(run_query "CREATE business SET name='Bad Price', slug='bad-price', category=category:gastronomy, city=city:cdmx, coordinates={type:'Point',coordinates:[0,0]}, price_range='$$$$', languages_spoken=['es'];")
if echo "$RES" | grep -qiE 'assert|conform|error'; then
    pass "A4 · Invalid price_range rejected by ASSERT"
else
    fail "A4 · price_range '$$$$' should be rejected" "$RES"
fi

# A5: unsupported locale in languages_spoken rejected
RES=$(run_query "CREATE business SET name='Bad Locale', slug='bad-locale', category=category:gastronomy, city=city:cdmx, coordinates={type:'Point',coordinates:[0,0]}, price_range='$', languages_spoken=['xx'];")
if echo "$RES" | grep -qiE 'assert|conform|error'; then
    pass "A5 · Unsupported locale in languages_spoken rejected by ASSERT"
else
    fail "A5 · Locale 'xx' should be rejected" "$RES"
fi

# ── GROUP B — Unique indexes ──────────────────────────────────────────────────

# B1: duplicate user email
# Note: user:admin with email 'admin@xibalba.mx' exists from seed.
RES=$(run_query "CREATE user SET email='admin@xibalba.mx', username='admin_dupe', password_hash='x', role='admin', locale='es';")
if echo "$RES" | grep -qiE 'already contains|unique|index|error'; then
    pass "B1 · Duplicate user email rejected by UNIQUE index"
else
    fail "B1 · Duplicate email should be blocked" "$RES"
fi

# B2: duplicate business slug
RES=$(run_query "CREATE business SET name='Dupe', slug='tacos-el-memo', category=category:gastronomy, city=city:cdmx, coordinates={type:'Point',coordinates:[0,0]}, price_range='$', languages_spoken=['es'];")
if echo "$RES" | grep -qiE 'already contains|unique|index|error'; then
    pass "B2 · Duplicate business slug rejected by UNIQUE index"
else
    fail "B2 · Duplicate slug 'tacos-el-memo' should be blocked" "$RES"
fi
