-- =============================================================================
-- Template — Seed: Users
-- =============================================================================

CREATE user:alice SET 
    username      = 'alice', 
    email         = 'alice@demo.com', 
    role          = 'admin', 
    display_name  = 'Alice Admin',
    locale        = 'en-US',
    country_code  = 'US',
    password_hash = 'hash',
    created_at    = time::now(),
    updated_at    = time::now();

CREATE user:bob SET 
    username      = 'bob', 
    email         = 'bob@demo.com', 
    role          = 'owner', 
    display_name  = 'Bob Owner',
    locale        = 'en-US',
    country_code  = 'US',
    password_hash = 'hash',
    created_at    = time::now(),
    updated_at    = time::now();

CREATE user:carol SET 
    username      = 'carol', 
    email         = 'carol@demo.com', 
    role          = 'user', 
    display_name  = 'Carol User',
    locale        = 'en-US',
    country_code  = 'US',
    password_hash = 'hash',
    created_at    = time::now(),
    updated_at    = time::now();

CREATE user:dave SET 
    username      = 'dave', 
    email         = 'dave@demo.com', 
    role          = 'user', 
    display_name  = 'Dave User',
    locale        = 'en-US',
    country_code  = 'US',
    password_hash = 'hash',
    created_at    = time::now(),
    updated_at    = time::now();
