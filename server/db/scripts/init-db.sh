#!/bin/bash

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
GRAY='\033[0;90m'
NC='\033[0m'    # No Color
BOLD='\033[1m'  # Bold
DIM='\033[2m'   # Dim

# Symbols
CHECK="✓"
CROSS="✗"
ARROW="→"
BULLET="•"

# Find and sort directories numerically
get_ordered_directories() {
    local base_dir="/init"
    find "$base_dir" -mindepth 1 -maxdepth 1 -type d | sort -n
}

# Get SQL files from a directory and sort them numerically
get_ordered_sql_files() {
    local dir=$1
    find "$dir" -type f -name "[0-9][0-9]*.sql" | sort -n
}

# Execute a single SQL file
execute_sql_file() {
    local file=$1
    local user=$2
    local db=$3
    local filename=$(basename "$file")
    local dirname=$(basename $(dirname "$file"))
    
    # Print execution start with hierarchical indentation
    echo -en "\t${GRAY}${BULLET} ${dirname}/${filename}${NC} "
    
    if psql -v ON_ERROR_STOP=1 --username "$user" --dbname "$db" -f "$file" > /dev/null 2>&1; then
        echo -e "${GREEN}${CHECK}${NC}"
        return 0
    else
        echo -e "${RED}${CROSS}${NC}"
        return 1
    fi
}

# Ensure database exists
ensure_database() {
    echo -e "${BLUE}${ARROW} Ensuring database exists${NC}"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "postgres" <<-EOSQL
        SELECT 'CREATE DATABASE $DB_NAME'
        WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec
EOSQL
    echo -e "\t${GREEN}${CHECK} Database check completed${NC}"
}

# Function to modify database settings
modify_database_settings() {
    echo -e "${BLUE}${ARROW} Modifying database settings...${NC}"
    
    # First, create new user and modify database from template1
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "template1" <<-EOSQL
        -- Create new user if it doesn't exist
        DO \$\$ 
        BEGIN
            IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_OWNER_ADMIN') THEN
                CREATE USER "$DB_OWNER_ADMIN" WITH PASSWORD '$DB_OWNER_PWORD' CREATEROLE;
            END IF;
        END
        \$\$;

        -- Update password and ensure CREATEROLE permission
        ALTER USER "$DB_OWNER_ADMIN" WITH PASSWORD '$DB_OWNER_PWORD' CREATEROLE;
EOSQL

    # Check if we need to rename the database
    if [ "$POSTGRES_DB" != "$DB_NAME" ]; then
        echo -e "${BLUE}${ARROW} Renaming database from $POSTGRES_DB to $DB_NAME${NC}"
        
        # Disconnect all users from the database
        psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "template1" <<-EOSQL
            SELECT pg_terminate_backend(pid) 
            FROM pg_stat_activity 
            WHERE datname = '$POSTGRES_DB' 
            AND pid != pg_backend_pid();
EOSQL

        # Sleep briefly to ensure connections are closed
        sleep 1

        # Rename the database only if names are different
        psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "template1" <<-EOSQL
            -- Rename the database only if it exists with the old name
            DO \$\$
            BEGIN
                IF EXISTS (SELECT FROM pg_database WHERE datname = '$POSTGRES_DB') 
                   AND NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME') THEN
                    EXECUTE 'ALTER DATABASE "$POSTGRES_DB" RENAME TO "$DB_NAME"';
                END IF;
            END \$\$;
EOSQL
    fi

    # Set permissions regardless of whether we renamed
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "template1" <<-EOSQL
        -- Grant privileges on the database
        GRANT ALL PRIVILEGES ON DATABASE "$DB_NAME" TO "$DB_OWNER_ADMIN";
        ALTER DATABASE "$DB_NAME" OWNER TO "$DB_OWNER_ADMIN";

        -- Grant additional necessary permissions
        ALTER USER "$DB_OWNER_ADMIN" WITH SUPERUSER;
EOSQL
    
    echo -e "${GREEN}${CHECK} Database settings modified successfully${NC}"
}

# Main execution
main() {
    echo -e "${BOLD}Database Initialization${NC}\n"

    ensure_database
    modify_database_settings
    echo

    # Process directories in order
    for dir in $(get_ordered_directories); do
        dir_name=$(basename "$dir")
        echo -e "${BLUE}${ARROW} ${dir_name}${NC}"
        
        for sql_file in $(get_ordered_sql_files "$dir"); do
            execute_sql_file "$sql_file" "$DB_OWNER_ADMIN" "$DB_NAME"
        done
        echo
    done

    # Print final status
    echo -e "${BOLD}Configuration Summary:${NC}"
    echo -e "${DIM}Database:${NC} $DB_NAME"
    echo -e "${DIM}User:${NC} $DB_OWNER_ADMIN"
    echo -e "${DIM}Password [${NC} $(echo $DB_OWNER_PWORD | wc -c) ${DIM}]:${NC} $DB_OWNER_PWORD"
    echo -e "\n${GREEN}${CHECK} Initialization complete${NC}\n"
}

# Run main function
set -e
main
