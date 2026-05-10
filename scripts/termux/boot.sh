#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
LOG_FILE="$ROOT_DIR/speypos-local/logs/runtime/watchdog.log"
mkdir -p "$(dirname "$LOG_FILE")"

# Intended for Termux:Boot. All output goes to the runtime log for diagnostics.
exec >> "$LOG_FILE" 2>&1
echo "[$(date '+%Y-%m-%d %H:%M:%S')] boot.sh triggered by Termux:Boot"
"$ROOT_DIR/scripts/termux/start.sh"