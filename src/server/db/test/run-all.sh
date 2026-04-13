#!/usr/bin/env bash
# =============================================================================
# Xibalbá — Test Orchestrator
# =============================================================================
# Usage: bash test/run-all.sh   (from db/ root)
# =============================================================================
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Boot shared fixtures (sets run_query, pass, fail, header, run_group)
# shellcheck source=fixtures.sh
. "$SCRIPT_DIR/fixtures.sh"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  Xibalbá · SurrealDB Test Suite                      ║"
echo "╚══════════════════════════════════════════════════════╝"

# ── Unit ─────────────────────────────────────────────────────────────────────
run_group "Schema integrity + Unique indexes" "$SCRIPT_DIR/unit/01-schema.sh"

# ── E2E ───────────────────────────────────────────────────────────────────────
run_group "Full smoke (FTS + refs + seed)" "$SCRIPT_DIR/e2e/01-smoke.sh"

# ── Summary ───────────────────────────────────────────────────────────────────
TOTAL=$((FAILS + PASS_COUNT))
echo "══════════════════════════════════════════════════════"
printf "  Results: %s/%s passed  |  %s failed\n" "$PASS_COUNT" "$TOTAL" "$FAILS"
echo "══════════════════════════════════════════════════════"
echo ""

if [ "$FAILS" -eq 0 ]; then
    echo "  All tests passed! 🎉"
    exit 0
else
    echo "  $FAILS test(s) failed."
    exit 1
fi
