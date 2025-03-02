-- File: 02-01-user.sql
-- Creates basic user-related tables that can be used in any web application

\set ON_ERROR_STOP on
\set ECHO all

-- Create the schema if it doesn't exist (using quoted identifier)
CREATE SCHEMA IF NOT EXISTS account;

-- Basic user profile information
CREATE TABLE IF NOT EXISTS account.profile (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User preferences and settings
CREATE TABLE IF NOT EXISTS account.preferences (
    user_id UUID PRIMARY KEY REFERENCES account.profile(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'en',
    notifications JSONB DEFAULT '{"email": true, "push": true}',
    settings JSONB DEFAULT '{}',  -- Flexible field for additional settings
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User roles for general purpose access control
CREATE TABLE IF NOT EXISTS account.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',  -- Flexible field for role-specific permissions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User-Role associations (many-to-many)
CREATE TABLE IF NOT EXISTS account.user_roles (
    user_id UUID REFERENCES account.profile(id) ON DELETE CASCADE,
    role_id UUID REFERENCES account.roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES account.profile(id),
    PRIMARY KEY (user_id, role_id)
);

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION account.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profile_timestamp
    BEFORE UPDATE ON account.profile
    FOR EACH ROW
    EXECUTE FUNCTION account.update_timestamp();

CREATE TRIGGER update_preferences_timestamp
    BEFORE UPDATE ON account.preferences
    FOR EACH ROW
    EXECUTE FUNCTION account.update_timestamp();

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profile_email ON account.profile(email);
CREATE INDEX IF NOT EXISTS idx_profile_username ON account.profile(username);
CREATE INDEX IF NOT EXISTS idx_profile_status ON account.profile(status);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON account.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON account.user_roles(role_id);
