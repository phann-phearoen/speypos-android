#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
LOG_FILE="$ROOT_DIR/speypos-local/logs/runtime/watchdog.log"

if [[ ! -f "$LOG_FILE" ]]; then
  echo "No runtime log found at $LOG_FILE"
  exit 0
fi

tail -n 200 -f "$LOG_FILE"