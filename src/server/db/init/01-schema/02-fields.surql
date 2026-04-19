USE NS app; USE DB main;
-- =============================================================================
-- Template — Field Definitions
-- =============================================================================

-- ---------------------------------------------------------------------------
-- tag: taxonomy
-- ---------------------------------------------------------------------------
DEFINE FIELD name ON tag TYPE string;
DEFINE FIELD slug ON tag TYPE string;
DEFINE FIELD created_at ON tag TYPE datetime DEFAULT time::now();

-- ---------------------------------------------------------------------------
-- user: admin, owner, user
-- ---------------------------------------------------------------------------
DEFINE FIELD username      ON user TYPE string;
DEFINE FIELD email         ON user TYPE string ASSERT string::is_email($value);
DEFINE FIELD password_hash ON user TYPE string;
DEFINE FIELD role          ON user TYPE string ASSERT $value IN ['admin', 'owner', 'user'];
DEFINE FIELD created_at    ON user TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at    ON user TYPE datetime DEFAULT time::now();

-- ---------------------------------------------------------------------------
-- session: auth sessions
-- ---------------------------------------------------------------------------
DEFINE FIELD user       ON session TYPE record<user> REFERENCE ON DELETE CASCADE;
DEFINE FIELD token      ON session TYPE string;
DEFINE FIELD expires_at ON session TYPE datetime;
DEFINE FIELD created_at ON session TYPE datetime DEFAULT time::now();

-- ---------------------------------------------------------------------------
-- item: core entity
-- ---------------------------------------------------------------------------
DEFINE FIELD title         ON item TYPE string;
DEFINE FIELD description   ON item TYPE option<string>;
DEFINE FIELD status        ON item TYPE string ASSERT $value IN ['draft', 'active', 'archived'];
DEFINE FIELD tags          ON item TYPE array<record<tag>>;
DEFINE FIELD coordinates   ON item TYPE option<geometry<point>>;
DEFINE FIELD rating        ON item TYPE float DEFAULT 0;
DEFINE FIELD comment_count ON item TYPE int   DEFAULT 0;
DEFINE FIELD created_at    ON item TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at    ON item TYPE datetime DEFAULT time::now() VALUE time::now();

-- ---------------------------------------------------------------------------
-- comment: user -> item
-- ---------------------------------------------------------------------------
DEFINE FIELD rating     ON comment TYPE int ASSERT $value >= 1 AND $value <= 5;
DEFINE FIELD body       ON comment TYPE option<string>;
DEFINE FIELD created_at ON comment TYPE datetime DEFAULT time::now();

-- ---------------------------------------------------------------------------
-- likes: user -> item
-- ---------------------------------------------------------------------------
DEFINE FIELD created_at ON likes TYPE datetime DEFAULT time::now();

-- ---------------------------------------------------------------------------
-- activity: audit log
-- ---------------------------------------------------------------------------
DEFINE FIELD type        ON activity TYPE string;
DEFINE FIELD target_user ON activity TYPE option<record<user>>;
DEFINE FIELD target_item ON activity TYPE option<record<item>>;
DEFINE FIELD meta        ON activity TYPE option<object>;
DEFINE FIELD meta.*      ON activity TYPE any;
DEFINE FIELD occurred_at ON activity TYPE datetime DEFAULT time::now();
