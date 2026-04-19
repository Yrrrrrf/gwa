USE NS app; USE DB main;
-- =============================================================================
-- Template — Index Definitions
-- =============================================================================

-- Unique indexes
DEFINE INDEX user_username ON user     FIELDS username UNIQUE;
DEFINE INDEX user_email    ON user     FIELDS email    UNIQUE;
DEFINE INDEX tag_slug      ON tag      FIELDS slug     UNIQUE;
DEFINE INDEX comment_edge  ON comment  FIELDS in, out  UNIQUE;

-- Full-text search
DEFINE ANALYZER ascii_bm25
    TOKENIZERS blank, class, camel, punct
    FILTERS ascii, lowercase, snowball(english);

DEFINE INDEX item_search ON item
    FIELDS title, description FULLTEXT ANALYZER ascii_bm25 BM25;
