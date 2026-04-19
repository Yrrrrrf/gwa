-- =============================================================================
-- Template — Function Definitions
-- =============================================================================

-- ---------------------------------------------------------------------------
-- fn::search_items: BM25 search with ranking
-- ---------------------------------------------------------------------------
DEFINE FUNCTION fn::search_items($query: string, $limit: int) {
    RETURN (
        SELECT * FROM item
        WHERE status = 'active'
          AND (string::lowercase(title) CONTAINS string::lowercase($query) OR string::lowercase(description) CONTAINS string::lowercase($query))
        ORDER BY rating DESC
        LIMIT $limit
    );
};

-- ---------------------------------------------------------------------------
-- fn::popular_items: Ranked by engagement score
-- ---------------------------------------------------------------------------
DEFINE FUNCTION fn::popular_items($limit: int) {
    RETURN (
        SELECT *, (rating * (comment_count OR 0.0dec)) AS score
        FROM item
        WHERE status = 'active'
        ORDER BY score DESC
        LIMIT $limit
    );
};

-- ---------------------------------------------------------------------------
-- fn::items_near: Geo-radius search
-- ---------------------------------------------------------------------------
DEFINE FUNCTION fn::items_near($point: geometry<point>, $radius_km: decimal) {
    LET $radius_m = $radius_km * 1000.0dec;
    RETURN (
        SELECT
            *,
            geo::distance(coordinates, $point) / 1000.0 AS distance_km
        FROM item
        WHERE status = 'active'
          AND coordinates != NONE
          AND geo::distance(coordinates, $point) <= $radius_m
        ORDER BY distance_km ASC
    );
};

-- ---------------------------------------------------------------------------
-- fn::user_recommendations: Collaborative filtering via graph traversal
-- ---------------------------------------------------------------------------
DEFINE FUNCTION fn::user_recommendations($user_id: record<user>, $limit: int) {
    -- Find items this user liked
    LET $liked = SELECT VALUE ->likes->item FROM only $user_id;
    -- Find other users who liked those same items
    LET $similar_raw = SELECT VALUE <-likes<-user FROM item WHERE id IN $liked;
    LET $similar_users = array::flatten($similar_raw);
    
    -- Find what else those users liked (excluding already-liked)
    LET $recommendations = (
        SELECT out AS item, count() AS overlap
        FROM likes
        WHERE in IN $similar_users
          AND in != $user_id
          AND out NOT IN $liked
        GROUP BY out
        ORDER BY overlap DESC
        LIMIT $limit
    );
    LET $item_ids = $recommendations.item;
    RETURN SELECT * FROM item WHERE id IN $item_ids;
};
