-- File: 02-02-auth.sql
-- Creates authentication-related tables that can be used in any web application

\set ON_ERROR_STOP on
\set ECHO all

-- Create schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS auth;

-- User credentials and authentication info
CREATE TABLE IF NOT EXISTS auth.credentials (
    user_id UUID PRIMARY KEY REFERENCES account.profile(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    last_password_change TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    force_password_change BOOLEAN DEFAULT false,
    password_reset_token TEXT,
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Session management
CREATE TABLE IF NOT EXISTS auth.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES account.profile(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    -- ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Authentication attempts tracking (for rate limiting and security)
CREATE TABLE IF NOT EXISTS auth.login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username_or_email VARCHAR(255) NOT NULL,
    -- ip_address INET,
    success BOOLEAN NOT NULL,
    attempt_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Two-factor authentication
CREATE TABLE IF NOT EXISTS auth.two_factor (
    user_id UUID PRIMARY KEY REFERENCES account.profile(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT false,
    secret TEXT,
    backup_codes TEXT[],
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
