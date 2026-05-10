#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

# Intended for Termux:Boot. Starts watchdog on device boot.
"$ROOT_DIR/scripts/termux/start.sh"