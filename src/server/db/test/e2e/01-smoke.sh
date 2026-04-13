#!/usr/bin/env bash
# =============================================================================
# GROUP F — Full-text search
# GROUP G — Reference integrity (ON DELETE REJECT)
# GROUP H — Seed data verification
# GROUP I — Geo radius search
# =============================================================================

# ── GROUP F — Full-text search ────────────────────────────────────────────────

# F1: title search (Tacos)
RES=$(run_query "SELECT name FROM business WHERE name @@ 'Tacos';")
if echo "$RES" | grep -qi 'Taquería El Memo'; then
    pass "F1 · Full-text search on name: 'Tacos' hits"
else
    fail "F1 · Full-text search for 'Tacos' should return Taquería El Memo" "$RES"
fi

# F2: diacritics-stripped search ('artesania' matches 'Artesanías')
RES=$(run_query "SELECT name FROM business WHERE name @@ 'artesanias';")
if echo "$RES" | grep -qi 'Artesanías Xochimilco'; then
    pass "F2 · Full-text search with ascii normalization works"
else
    fail "F2 · Full-text search for 'artesania' should match 'Artesanías'" "$RES"
fi

# ── GROUP G — Reference integrity ────────────────────────────────────────────

# G1: cannot delete a city that a business uses
RES=$(run_query "DELETE city:cdmx;")
if echo "$RES" | grep -qiE 'reject|reference|error|cannot'; then
    pass "G1 · ON DELETE REJECT: cannot delete city used by business"
else
    fail "G1 · Deleting a referenced city should be rejected" "$RES"
fi

# ── GROUP H — Seed data verification ─────────────────────────────────────────

# H1: user count
RES=$(run_query "SELECT count() FROM user GROUP ALL;")
if echo "$RES" | grep -qE '"count":8'; then
    pass "H1 · Users seeded (8 records)"
else
    fail "H1 · Expected 8 users" "$RES"
fi

# H2: business count
# 7 seeded + 1 from D3 = 8.
RES=$(run_query "SELECT count() FROM business GROUP ALL;")
if echo "$RES" | grep -qE '"count":8'; then
    pass "H2 · Businesses seeded + new_biz created (8 records)"
else
    fail "H2 · Expected 8 businesses" "$RES"
fi

# H3: review count
# 7 seeded + 1 from C4 (Akiko->Tacos) + 1 from D1 (Rafael->Cantina) = 9.
RES=$(run_query "SELECT count() FROM review GROUP ALL;")
COUNT=$(echo "$RES" | grep -oP '"count":\K[0-9]+')
if [ "$COUNT" -ge 9 ]; then
    pass "H3 · Reviews seeded + integration added ($COUNT records, min 9)"
else
    fail "H3 · Expected at least 9 reviews, got $COUNT" "$RES"
fi

# ── GROUP I — Geo radius search ──────────────────────────────────────────────

# I1: Geo search near CDMX Zócalo (radius 10km)
# CDMX Zócalo: [-99.1332, 19.4326]
RES=$(run_query "SELECT name FROM fn::businesses_near({type:'Point', coordinates:[-99.1332, 19.4326]}, 10.0dec);")
if echo "$RES" | grep -qi 'Taquería El Memo' && echo "$RES" | grep -qi 'Artesanías Xochimilco'; then
    pass "I1 · Geo search: fn::businesses_near returns businesses within radius"
else
    fail "I1 · Geo search should return CDMX businesses" "$RES"
fi

# I2: Geo search far from CDMX (radius 10km in Tokyo)
# Tokyo: [139.6503, 35.6762]
RES=$(run_query "SELECT name FROM fn::businesses_near({type:'Point', coordinates:[139.6503, 35.6762]}, 10.0dec);")
if echo "$RES" | grep -qE '"result":\[\]'; then
    pass "I2 · Geo search: fn::businesses_near returns empty for far location"
else
    fail "I2 · Geo search in Tokyo should return empty" "$RES"
fi
