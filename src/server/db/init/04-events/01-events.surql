-- =============================================================================
-- Template — Event Definitions
-- =============================================================================

-- ---------------------------------------------------------------------------
-- on_comment_created: update item stats and log activity
-- ---------------------------------------------------------------------------
DEFINE EVENT on_comment_created ON comment WHEN $event = 'CREATE' THEN {
    LET $item = $after.out;
    LET $stats = (SELECT math::mean(rating) AS avg_rating, count() AS total FROM comment WHERE out = $item GROUP ALL);
    UPDATE $item SET
        rating = $stats[0].avg_rating OR 0,
        comment_count = $stats[0].total OR 0;
    
    CREATE activity SET
        type = 'comment.created',
        target_user = $after.in,
        target_item = $item,
        meta = { rating: $after.rating },
        occurred_at = time::now();
};

-- ---------------------------------------------------------------------------
-- on_comment_deleted: update item stats
-- ---------------------------------------------------------------------------
DEFINE EVENT on_comment_deleted ON comment WHEN $event = 'DELETE' THEN {
    LET $item = $before.out;
    LET $stats = (SELECT math::mean(rating) AS avg_rating, count() AS total FROM comment WHERE out = $item GROUP ALL);
    UPDATE $item SET
        rating = $stats[0].avg_rating OR 0,
        comment_count = $stats[0].total OR 0;
};

-- ---------------------------------------------------------------------------
-- on_item_liked: log activity
-- ---------------------------------------------------------------------------
DEFINE EVENT on_item_liked ON likes WHEN $event = 'CREATE' THEN {
    CREATE activity SET
        type = 'item.liked',
        target_user = $after.in,
        target_item = $after.out,
        occurred_at = time::now();
};

-- ---------------------------------------------------------------------------
-- on_user_deleted: cleanup sessions (manual CASCADE)
-- ---------------------------------------------------------------------------
DEFINE EVENT on_user_deleted ON user WHEN $event = 'DELETE' THEN {
    DELETE session WHERE user = $before.id;
};
