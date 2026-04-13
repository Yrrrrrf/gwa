#!/usr/bin/env bash
# =============================================================================
# GROUP C — Computed fields
# =============================================================================

# C1: business.rating average (Mezcalería has 2 reviews: 4 and 5)
RES=$(run_query "SELECT rating FROM business:mezcaleria_la_condesa;")
if echo "$RES" | grep -q '4.5'; then
    pass "C1 · business.rating computed correctly for mezcaleria_la_condesa (avg: 4.5)"
else
    fail "C1 · rating should be 4.5 for mezcaleria_la_condesa" "$RES"
fi

# C2: business.review_count (Tacos El Memo has 1 review)
RES=$(run_query "SELECT review_count FROM business:tacos_el_memo;")
if echo "$RES" | grep -q '1'; then
    pass "C2 · business.review_count computed correctly (1 review)"
else
    fail "C2 · review_count should be 1 for tacos_el_memo" "$RES"
fi

# C3: category.path hierarchy (Gastronomía > Tacos)
# First, find if there is a child category
run_query "CREATE category:tacos SET name='Tacos', slug='tacos', parent=category:gastronomy;" > /dev/null
RES=$(run_query "SELECT path FROM category:tacos;")
if echo "$RES" | grep -q 'Gastronomía > Tacos'; then
    pass "C3 · category.path computed correctly through hierarchy"
else
    fail "C3 · category.path should be 'Gastronomía > Tacos'" "$RES"
fi

# C4: business.rating after adding a second review
# Tacos El Memo currently has 5. Adding a 3 should make it 4.
run_query "RELATE user:tourist_akiko->review->business:tacos_el_memo SET rating=3, locale='ja';" > /dev/null
RES=$(run_query "SELECT rating FROM business:tacos_el_memo;")
if echo "$RES" | grep -q '4'; then
    pass "C4 · business.rating re-computed correctly after 2nd review (avg: 4)"
else
    fail "C4 · rating should be 4 for tacos_el_memo after 2nd review" "$RES"
fi
