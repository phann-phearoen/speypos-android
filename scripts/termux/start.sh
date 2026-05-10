#!/data/data/com.termux/files/usr/bin/bash
set -u

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/speypos-local/logs/runtime"
WATCHDOG_PID_FILE="$RUNTIME_DIR/watchdog.pid"
STOP_FILE="$RUNTIME_DIR/stop.flag"

mkdir -p "$RUNTIME_DIR"
rm -f "$STOP_FILE"

if [[ -f "$WATCHDOG_PID_FILE" ]] && kill -0 "$(cat "$WATCHDOG_PID_FILE")" 2>/dev/null; then
  echo "Watchdog already running with PID $(cat "$WATCHDOG_PID_FILE")."
  exit 0
fi

nohup "$ROOT_DIR/scripts/termux/watchdog.sh" >/dev/null 2>&1 &
echo "Started watchdog."