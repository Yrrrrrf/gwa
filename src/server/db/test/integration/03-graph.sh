#!/usr/bin/env bash
# =============================================================================
# GROUP E — Graph traversal
# =============================================================================

# E1: forward — owner manages businesses
RES=$(run_query "SELECT ->manages->business.name AS properties FROM user:owner_carlos;")
if echo "$RES" | grep -qi 'Taquería El Memo'; then
    pass "E1 · Forward traversal: owner_carlos ->manages-> business"
else
    fail "E1 · owner_carlos should manage 'Taquería El Memo'" "$RES"
fi

# E2: reverse — find owners for a business
RES=$(run_query "SELECT <-manages<-user.username AS owners FROM business:tacos_el_memo;")
if echo "$RES" | grep -qi 'owner_carlos'; then
    pass "E2 · Reverse traversal: business:tacos_el_memo <-manages<- user"
else
    fail "E2 · owner_carlos should appear as owner of tacos_el_memo" "$RES"
fi

# E3: visits relation
RES=$(run_query "SELECT ->visits->business.name AS visited FROM user:tourist_akiko;")
if echo "$RES" | grep -qi 'Artesanías Xochimilco'; then
    pass "E3 · Forward traversal: tourist_akiko ->visits-> business"
else
    fail "E3 · tourist_akiko should have visited 'Artesanías Xochimilco'" "$RES"
fi

# E4: favorites relation
RES=$(run_query "SELECT ->favorites->business.name AS favorites FROM user:tourist_james;")
if echo "$RES" | grep -qi 'Taquería El Memo'; then
    pass "E4 · Forward traversal: tourist_james ->favorites-> business"
else
    fail "E4 · tourist_james should have favorited 'Taquería El Memo'" "$RES"
fi

# E5: Recommendation engine (Graph AI)
# Akiko visited Artesanías Xochimilco and Tours CDMX.
# James also visited Artesanías Xochimilco.
# James visited Tacos El Memo and Mezcalería La Condesa.
# So Akiko should be recommended Tacos El Memo or Mezcalería La Condesa.
RES=$(run_query "RETURN fn::tourist_recommendations(user:tourist_akiko, 5)")
if echo "$RES" | grep -qE 'business:tacos_el_memo|business:mezcaleria_la_condesa'; then
    pass "E5 · Recommendation Engine: fn::tourist_recommendations returns valid graph results"
else
    fail "E5 · Recommendation engine should suggest businesses based on similar tourists" "$RES"
fi
