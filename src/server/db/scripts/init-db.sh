#!/bin/sh
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
GRAY='\033[0;90m'
NC='\033[0m'
BOLD='\033[1m'
CHECK='✓'
CROSS='✗'
ARROW='→'
BULLET='•'

URL="${SURREAL_URL:-http://localhost:8000/sql}"
SURREAL_USER="${SURREAL_USER:-root}"
SURREAL_PASS="${SURREAL_PASS:-root}"
NS="${SURREAL_NS:-app}"
DB="${SURREAL_DB:-main}"

# ---------------------------------------------------------------------------
run_surql() {
    curl -s -X POST "$URL" \
        -H "Accept: application/json" \
        -H "surreal-ns: $NS" \
        -H "surreal-db: $DB" \
        -u "$SURREAL_USER:$SURREAL_PASS" \
        --data-binary "@$1"
}

execute_surql_file() {
    local file="$1"
    local filename=$(basename "$file")
    local dirname=$(basename "$(dirname "$file")")
    printf "\t${GRAY}${BULLET} %s/%s${NC} " "$dirname" "$filename"

    RESPONSE=$(run_surql "$file")

    if echo "$RESPONSE" | grep -q '"status":"ERR"'; then
        printf "${RED}${CROSS}${NC}\n"
        printf "${RED}    %s${NC}\n" "$RESPONSE"
        return 1
    else
        printf "${GREEN}${CHECK}${NC}\n"
    fi
}

# ---------------------------------------------------------------------------
main() {
    printf "${BOLD}Template — SurrealDB Initialization${NC}\n\n"

    printf "${BLUE}${ARROW} Provisioning Namespace/DB${NC}\n"
    RESPONSE=$(curl -s -X POST "$URL" \
        -H "Accept: application/json" \
        -u "$SURREAL_USER:$SURREAL_PASS" \
        -d "DEFINE NAMESPACE IF NOT EXISTS $NS; DEFINE DATABASE IF NOT EXISTS $DB ON NAMESPACE $NS;")
    
    if echo "$RESPONSE" | grep -q '"status":"ERR"'; then
        printf "\t${RED}${CROSS} Provisioning failed${NC}\n"
        printf "${RED}    %s${NC}\n" "$RESPONSE"
        exit 1
    fi
    printf "\t${GREEN}${CHECK} Namespace: %s, Database: %s${NC}\n\n" "$NS" "$DB"

    local base="/init"

    for dir in $(find "$base" -mindepth 1 -maxdepth 1 -type d | sort); do
        printf "${BLUE}${ARROW} %s${NC}\n" "$(basename "$dir")"
        for f in $(find "$dir" -name "*.surql" | sort); do
            execute_surql_file "$f" || exit 1
        done
        printf "\n"
    done

    printf "${GREEN}${CHECK} Initialization complete — %s/%s${NC}\n\n" "$NS" "$DB"
}

main
