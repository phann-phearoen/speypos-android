#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/speypos-local/logs/runtime"
WATCHDOG_PID_FILE="$RUNTIME_DIR/watchdog.pid"
APP_PID_FILE="$RUNTIME_DIR/app.pid"
STOP_FILE="$RUNTIME_DIR/stop.flag"
LOG_FILE="$RUNTIME_DIR/watchdog.log"
LOCAL_PACKAGE_JSON="$ROOT_DIR/speypos-local/package.json"

# Source .env to read PORT for health check URL (fallback: 8080)
ENV_FILE="$ROOT_DIR/speypos-local/.env"
if [[ -f "$ENV_FILE" ]]; then
  PORT="$(grep -E '^PORT=' "$ENV_FILE" | head -1 | cut -d= -f2 | tr -d '[:space:]')" || true
fi
PORT="${PORT:-8080}"

HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:${PORT}/api/health}"

# Check curl availability once at startup; degrade gracefully if absent
HAS_CURL=0
if command -v curl >/dev/null 2>&1; then
  HAS_CURL=1
fi
HEALTH_INTERVAL="${HEALTH_INTERVAL:-5}"
HEALTH_FAIL_THRESHOLD="${HEALTH_FAIL_THRESHOLD:-3}"
RESTART_BACKOFF_BASE="${RESTART_BACKOFF_BASE:-2}"
RESTART_BACKOFF_MAX="${RESTART_BACKOFF_MAX:-20}"
REBOOT_EXIT_CODE="${REBOOT_EXIT_CODE:-75}"

mkdir -p "$RUNTIME_DIR"

if [[ -f "$WATCHDOG_PID_FILE" ]] && kill -0 "$(cat "$WATCHDOG_PID_FILE")" 2>/dev/null; then
  echo "Watchdog already running with PID $(cat "$WATCHDOG_PID_FILE")."
  exit 0
fi

echo $$ > "$WATCHDOG_PID_FILE"
rm -f "$STOP_FILE"

if [[ ! -f "$LOCAL_PACKAGE_JSON" ]]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] fatal: missing $LOCAL_PACKAGE_JSON" >> "$LOG_FILE"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] hint: repository clone is incomplete; ensure speypos-local/package.json is tracked and present" >> "$LOG_FILE"
  exit 1
fi

if (( HAS_CURL == 0 )); then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] warning: curl not found; health polling disabled" >> "$LOG_FILE"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] watchdog started (pid=$$, port=$PORT, health_url=$HEALTH_URL)" >> "$LOG_FILE"

cleanup() {
  rm -f "$WATCHDOG_PID_FILE"
  rm -f "$APP_PID_FILE"
}
trap cleanup EXIT

restart_count=0

while true; do
  if [[ -f "$STOP_FILE" ]]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] stop flag detected; exiting watchdog" >> "$LOG_FILE"
    break
  fi

  echo "[$(date '+%Y-%m-%d %H:%M:%S')] launching backend" >> "$LOG_FILE"
  (
    cd "$ROOT_DIR/speypos-local" || exit 1
    RUNTIME_PROFILE=android-termux FORCE_CONSOLE_PRINTER=true node src/index.js
  ) >> "$LOG_FILE" 2>&1 &
  app_pid=$!
  echo "$app_pid" > "$APP_PID_FILE"

  health_failures=0
  while kill -0 "$app_pid" 2>/dev/null; do
    sleep "$HEALTH_INTERVAL"

    if [[ -f "$STOP_FILE" ]]; then
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] stopping backend (pid=$app_pid)" >> "$LOG_FILE"
      kill -TERM "$app_pid" 2>/dev/null || true
      break
    fi

    if (( HAS_CURL == 0 )); then
      : # curl not available; skip health polling
    elif curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
      health_failures=0
    else
      health_failures=$((health_failures + 1))
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] health check failed ($health_failures/$HEALTH_FAIL_THRESHOLD)" >> "$LOG_FILE"

      if (( health_failures >= HEALTH_FAIL_THRESHOLD )); then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] health threshold reached; restarting backend" >> "$LOG_FILE"
        kill -TERM "$app_pid" 2>/dev/null || true
        sleep 5
        kill -0 "$app_pid" 2>/dev/null && kill -KILL "$app_pid" 2>/dev/null || true
        break
      fi
    fi
  done

  wait "$app_pid"
  exit_code=$?
  rm -f "$APP_PID_FILE"

  if [[ -f "$STOP_FILE" ]]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] backend stopped due to manual stop" >> "$LOG_FILE"
    break
  fi

  if (( exit_code == REBOOT_EXIT_CODE )); then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] backend requested reboot (exit=$exit_code); restarting immediately" >> "$LOG_FILE"
    restart_count=0
    continue
  fi

  restart_count=$((restart_count + 1))
  backoff=$((RESTART_BACKOFF_BASE * restart_count))
  if (( backoff > RESTART_BACKOFF_MAX )); then
    backoff="$RESTART_BACKOFF_MAX"
  fi

  echo "[$(date '+%Y-%m-%d %H:%M:%S')] backend exited (code=$exit_code); restart in ${backoff}s" >> "$LOG_FILE"
  sleep "$backoff"
done
