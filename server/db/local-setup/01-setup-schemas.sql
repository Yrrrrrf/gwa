-- Enable psql command echoing and stop on error
\set ON_ERROR_STOP on
\set ECHO all

-- Enable necessary extensions in the database
DO $$
DECLARE
    ext TEXT;
    extensions TEXT[] := ARRAY['uuid-ossp', 'pgcrypto', 'pg_trgm'];
BEGIN
    FOREACH ext IN ARRAY extensions
    LOOP
        EXECUTE format('CREATE EXTENSION IF NOT EXISTS %I', ext);
        RAISE NOTICE 'Extension % enabled', ext;
    END LOOP;
END $$;

-- File: 01_schema_setup.sql
-- # Script steps:
--     1. Creates specified schemas with a logical structure
--     2. Creates roles with appropriate permissions
--     3. Establishes cross-schema access where necessary
--
-- # Note:
--     Ensure this script is run by a user with sufficient privileges to create schemas and roles.

-- Enable psql command echoing and stop on error
\set ON_ERROR_STOP on
\set ECHO all

-- ^ Enable necessary extensions in the database
--    These extensions provide additional functionality for data management and analysis.
DO $$
DECLARE
    ext TEXT;  -- Extension name
    extensions TEXT[] := ARRAY[  -- List of extensions to enable
        'uuid-ossp',  -- generate universally unique identifiers (UUIDs)
        'pgcrypto',   -- cryptographic functions
        'pg_trgm'     -- trigram matching for similarity search
    ];
BEGIN
    FOREACH ext IN ARRAY extensions
    LOOP
        EXECUTE format('CREATE EXTENSION IF NOT EXISTS %I', ext);
        RAISE NOTICE 'Extension % enabled', ext;
    END LOOP;
END $$;

-- Create the corrected function that explicitly uses the current database
CREATE OR REPLACE FUNCTION create_schemas(schema_names TEXT[])
RETURNS VOID AS $$
DECLARE
    schema_name TEXT;
    current_db TEXT;
BEGIN
    SELECT current_database() INTO current_db;
    FOREACH schema_name IN ARRAY schema_names
    LOOP
        -- Create schema in the current database explicitly
        EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);
        RAISE NOTICE 'Schema % created or already exists in database %', schema_name, current_db;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ^ Function to create role and grant privileges
CREATE OR REPLACE FUNCTION create_and_grant_role(
    role_name TEXT,
    role_password TEXT,
    primary_schemas TEXT[],
    read_schemas TEXT[]
) RETURNS VOID AS $$
DECLARE
    schema_name TEXT;
BEGIN
    -- Create role if it doesn't exist, otherwise update password
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = role_name) THEN
        EXECUTE format('CREATE ROLE %I WITH LOGIN PASSWORD %L', role_name, role_password);
        RAISE NOTICE 'Role % created successfully', role_name;
    ELSE
        EXECUTE format('ALTER ROLE %I WITH PASSWORD %L', role_name, role_password);
        RAISE NOTICE 'Password updated for existing role %', role_name;
    END IF;

    -- Grant full privileges on primary schemas (for data management)
    FOREACH schema_name IN ARRAY primary_schemas
    LOOP
        EXECUTE format('GRANT ALL PRIVILEGES ON SCHEMA %I TO %I', schema_name, role_name);
        EXECUTE format('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA %I TO %I', schema_name, role_name);
        EXECUTE format('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA %I TO %I', schema_name, role_name);
        EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL PRIVILEGES ON TABLES TO %I', schema_name, role_name);
        EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL PRIVILEGES ON SEQUENCES TO %I', schema_name, role_name);
    END LOOP;

    -- Grant read privileges on specified schemas (for cross-schema access)
    FOREACH schema_name IN ARRAY read_schemas
    LOOP
        EXECUTE format('GRANT USAGE ON SCHEMA %I TO %I', schema_name, role_name);
        EXECUTE format('GRANT SELECT ON ALL TABLES IN SCHEMA %I TO %I', schema_name, role_name);
        EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT SELECT ON TABLES TO %I', schema_name, role_name);
    END LOOP;

    RAISE NOTICE 'Privileges granted to % on primary schemas % and read access to %', role_name, primary_schemas, read_schemas;
END;
$$ LANGUAGE plpgsql;

\c gwa

-- Create schemas
SELECT create_schemas(ARRAY[
    -- * main schemas
    'account',        -- For user information and roles
    'auth'         -- For user authentication and authorization
    -- * additional schemas
    -- todo: Add some really cool schemas here...
]);

-- * Create roles and grant privileges for each schema
SELECT create_and_grant_role(
    'director',
    'secure_director_pwd',
    ARRAY['account'],
    ARRAY['auth']
);
