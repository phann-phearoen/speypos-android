#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

"$ROOT_DIR/scripts/termux/stop.sh" || true
"$ROOT_DIR/scripts/termux/start.sh"
"$ROOT_DIR/scripts/termux/status.sh"