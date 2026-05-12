#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

if "$ROOT_DIR/scripts/termux/wake-lock.sh" acquire >/dev/null 2>&1; then
  echo "Shift open: wake lock acquired."
else
  echo "Shift open: wake lock unavailable; continuing without lock."
fi

"$ROOT_DIR/scripts/termux/start.sh"
"$ROOT_DIR/scripts/termux/status.sh"
