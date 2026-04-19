-- =============================================================================
-- Template — Seed: Users
-- =============================================================================

CREATE user:alice SET 
    username      = 'alice', 
    email         = 'alice@demo.com', 
    role          = 'admin', 
    password_hash = 'hash';

CREATE user:bob SET 
    username      = 'bob', 
    email         = 'bob@demo.com', 
    role          = 'owner', 
    password_hash = 'hash';

CREATE user:carol SET 
    username      = 'carol', 
    email         = 'carol@demo.com', 
    role          = 'user', 
    password_hash = 'hash';

CREATE user:dave SET 
    username      = 'dave', 
    email         = 'dave@demo.com', 
    role          = 'user', 
    password_hash = 'hash';
