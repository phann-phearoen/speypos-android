#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/speypos-local/logs/runtime"
WATCHDOG_PID_FILE="$RUNTIME_DIR/watchdog.pid"
STOP_FILE="$RUNTIME_DIR/stop.flag"
WAKE_LOCK_MODE="${WAKE_LOCK_MODE:-auto}"

mkdir -p "$RUNTIME_DIR"
rm -f "$STOP_FILE"

if [[ "$WAKE_LOCK_MODE" != "off" ]]; then
  if "$ROOT_DIR/scripts/termux/wake-lock.sh" acquire >/dev/null 2>&1; then
    echo "Wake lock acquired."
  elif [[ "$WAKE_LOCK_MODE" == "required" ]]; then
    echo "Wake lock is required but unavailable. Set WAKE_LOCK_MODE=off to bypass."
    exit 1
  else
    echo "Wake lock unavailable; continuing without lock (WAKE_LOCK_MODE=auto)."
  fi
fi

if [[ -f "$WATCHDOG_PID_FILE" ]] && kill -0 "$(cat "$WATCHDOG_PID_FILE")" 2>/dev/null; then
  echo "Watchdog already running with PID $(cat "$WATCHDOG_PID_FILE")."
  exit 0
fi

bash "$ROOT_DIR/scripts/termux/deploy-pwa.sh"

nohup "$ROOT_DIR/scripts/termux/watchdog.sh" >/dev/null 2>&1 &

# Poll up to 2 s for watchdog to write its PID file (confirms it actually started)
for i in 1 2 3 4; do
  sleep 0.5
  if [[ -f "$WATCHDOG_PID_FILE" ]] && kill -0 "$(cat "$WATCHDOG_PID_FILE")" 2>/dev/null; then
    echo "Started watchdog (pid=$(cat "$WATCHDOG_PID_FILE"))."
    exit 0
  fi
done

echo "Warning: watchdog may not have started. Check logs/runtime/watchdog.log"