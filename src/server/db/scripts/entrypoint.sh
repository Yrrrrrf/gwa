#!/bin/sh
set -e

echo "Starting SurrealDB..."
surreal start \
    --log "${SURREAL_LOG:-info}" \
    --user "${SURREAL_USER:-root}" \
    --pass "${SURREAL_PASS:-root}" \
    --bind "0.0.0.0:${SURREAL_PORT:-8000}" \
    "${SURREAL_PATH:-memory}" &
PID=$!

if [ "${SEED_ON_START:-true}" = "true" ]; then
    echo "Waiting for SurrealDB to accept connections..."
    sleep 3
    for i in 1 2 3 4 5; do
        if surreal sql \
            --endpoint "http://127.0.0.1:${SURREAL_PORT:-8000}" \
            -u "${SURREAL_USER:-root}" \
            -p "${SURREAL_PASS:-root}" \
            --ns "${SURREAL_NS:-template}" \
            --db "${SURREAL_DB:-main}" \
            -q 'RETURN true;' > /dev/null 2>&1; then
            break
        fi
        sleep 2
    done

    echo "Running init-db.sh..."
    /scripts/init-db.sh
    echo "Initialization complete."
fi

wait $PID
