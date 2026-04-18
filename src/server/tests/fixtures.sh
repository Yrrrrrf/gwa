#!/usr/bin/env bash
# =============================================================================
# Xibalbá — Test Fixtures & Shared Utilities
# =============================================================================
# Source this file in every test script. Do NOT execute directly.
# =============================================================================

URL="${SURREAL_URL:-http://127.0.0.1:8000/sql}"
SURREAL_USER="${SURREAL_USER:-root}"
SURREAL_PASS="${SURREAL_PASS:-super_secret_dev_pass_override_me}"
NS="${SURREAL_NS:-app}"
DB="${SURREAL_DB:-main}"

# Shared counters (accumulated across all sourced test scripts)
PASS_COUNT="${PASS_COUNT:-0}"
FAILS="${FAILS:-0}"

# ---------------------------------------------------------------------------
run_query() {
    # Using xh as in the reference, ensuring it is available or fallback to curl
    if command -v xh >/dev/null 2>&1; then
        xh post "$URL" \
            Accept:application/json \
            surreal-ns:"$NS" \
            surreal-db:"$DB" \
            -a "$SURREAL_USER:$SURREAL_PASS" \
            --raw "$1" 2>/dev/null
    else
        curl -sf -X POST "$URL" \
            -H "Accept: application/json" \
            -H "surreal-ns: $NS" \
            -H "surreal-db: $DB" \
            -u "$SURREAL_USER:$SURREAL_PASS" \
            --data-binary "$1" 2>/dev/null
    fi
}

pass() { echo "  ✔  $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo "  ❌ $1"; echo "     Response: $2"; FAILS=$((FAILS + 1)); }

header() {
    echo ""
    echo "╔══════════════════════════════════════════════════════╗"
    printf  "║  %-52s  ║\n" "$1"
    echo "╚══════════════════════════════════════════════════════╝"
}

# run_group <name> <script>
# Sources a test script inside a labeled box, accumulating pass/fail counts.
run_group() {
    local name="$1"
    local script="$2"
    header "$name"
    # shellcheck source=/dev/null
    . "$script"
    echo ""
}
