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

wake_status="unknown"
if wake_output="$ROOT_DIR/scripts/termux/wake-lock.sh" status 2>/dev/null; then
  wake_status="$wake_output"
else
  wake_status="wake-lock: unavailable"
fi

echo "watchdog: $watchdog_status"
echo "backend:  $app_status"
echo "$wake_status"