#!/data/data/com.termux/files/usr/bin/bash
set -u

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/speypos-local/logs/runtime"
WATCHDOG_PID_FILE="$RUNTIME_DIR/watchdog.pid"
APP_PID_FILE="$RUNTIME_DIR/app.pid"
STOP_FILE="$RUNTIME_DIR/stop.flag"

touch "$STOP_FILE"

if [[ -f "$APP_PID_FILE" ]] && kill -0 "$(cat "$APP_PID_FILE")" 2>/dev/null; then
  kill -TERM "$(cat "$APP_PID_FILE")" 2>/dev/null || true
fi

if [[ -f "$WATCHDOG_PID_FILE" ]] && kill -0 "$(cat "$WATCHDOG_PID_FILE")" 2>/dev/null; then
  kill -TERM "$(cat "$WATCHDOG_PID_FILE")" 2>/dev/null || true
fi

echo "Stop signal sent."