#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/speypos-local/logs/runtime"
WATCHDOG_PID_FILE="$RUNTIME_DIR/watchdog.pid"
APP_PID_FILE="$RUNTIME_DIR/app.pid"

watchdog_status="stopped"
app_status="stopped"

if [[ -f "$WATCHDOG_PID_FILE" ]] && kill -0 "$(cat "$WATCHDOG_PID_FILE")" 2>/dev/null; then
  watchdog_status="running (pid=$(cat "$WATCHDOG_PID_FILE"))"
fi

if [[ -f "$APP_PID_FILE" ]] && kill -0 "$(cat "$APP_PID_FILE")" 2>/dev/null; then
  app_status="running (pid=$(cat "$APP_PID_FILE"))"
fi

echo "watchdog: $watchdog_status"
echo "backend:  $app_status"