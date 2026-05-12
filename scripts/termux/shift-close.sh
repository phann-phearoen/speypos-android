#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

"$ROOT_DIR/scripts/termux/stop.sh" || true

if "$ROOT_DIR/scripts/termux/wake-lock.sh" release >/dev/null 2>&1; then
  echo "Shift close: wake lock released."
else
  echo "Shift close: wake lock unavailable; nothing to release."
fi

"$ROOT_DIR/scripts/termux/status.sh"
