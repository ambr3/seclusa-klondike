#!/usr/bin/env bash
# Run this app's tests from its own folder.
set -euo pipefail
cd "$(dirname "$0")"

echo "→ $(basename "$PWD") tests @ $PWD"

echo "-- header parser --"
python3 scripts/test_serve.py

echo "-- game suite --"

WORKSPACE="$(cd ../.. && pwd)"
NODE="$WORKSPACE/tools/nvm/versions/node/v24.21.0/bin/node"
HARNESS="$WORKSPACE/tools/pkg/playwright/run-games-tests.mjs"

if [ ! -x "$NODE" ]; then
  echo "FAIL: node not found at $NODE"
  exit 1
fi
if [ ! -f "$HARNESS" ]; then
  echo "FAIL: playwright harness not found at $HARNESS"
  exit 1
fi

PORT=8123
python3 scripts/serve.py "$PORT" >/dev/null 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT

for _ in $(seq 1 50); do
  if curl -sf "http://127.0.0.1:$PORT/test/tests.html" >/dev/null 2>&1; then
    break
  fi
  sleep 0.1
done

export PLAYWRIGHT_BROWSERS_PATH="$WORKSPACE/tools/pkg/playwright/browsers"
export GAMES_TEST_BASE="http://127.0.0.1:$PORT"
export GAMES_TEST_URL="/test/tests.html"
"$NODE" "$HARNESS"

echo "→ $(basename "$PWD") tests passed"
