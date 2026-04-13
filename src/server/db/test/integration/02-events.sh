#!/usr/bin/env bash
# =============================================================================
# GROUP D — Events (live DB, side effects)
# =============================================================================

# D1: on_review_created — activity record produced
# Cantina La Perla (business:cantina_la_perla) currently has 0 reviews.
# Its owner is Roberto (user:owner_roberto).
run_query "RELATE user:tourist_rafael->review->business:cantina_la_perla SET rating=5, locale='pt';" > /dev/null
sleep 1 # allow event to fire
RES=$(run_query "SELECT type FROM activity WHERE target_business = business:cantina_la_perla AND type = 'review.received';")
if echo "$RES" | grep -q 'review.received'; then
    pass "D1 · on_review_created event: activity record 'review.received' produced"
else
    fail "D1 · An activity record 'review.received' should be auto-created" "$RES"
fi

# D2: on_review_created — first-review milestone produced
RES=$(run_query "SELECT type FROM activity WHERE target_business = business:cantina_la_perla AND type = 'review.first';")
if echo "$RES" | grep -q 'review.first'; then
    pass "D2 · on_review_created event: activity record 'review.first' produced"
else
    fail "D2 · An activity record 'review.first' should be auto-created" "$RES"
fi

# D3: on_business_verified — activity record produced on verification
# Create a new unverified business
run_query "CREATE business:new_biz SET name='New Biz', slug='new-biz', category=category:gastronomy, city=city:cdmx, coordinates={type:'Point',coordinates:[0,0]}, price_range='$', languages_spoken=['es'], is_verified=false;" > /dev/null
run_query "RELATE user:owner_carlos->manages->business:new_biz;" > /dev/null
# Verify it
run_query "UPDATE business:new_biz SET is_verified = true;" > /dev/null
sleep 1
RES=$(run_query "SELECT type FROM activity WHERE target_business = business:new_biz AND type = 'business.verified';")
if echo "$RES" | grep -q 'business.verified'; then
    pass "D3 · on_business_verified event: activity record produced"
else
    fail "D3 · An activity record 'business.verified' should be auto-created" "$RES"
fi
