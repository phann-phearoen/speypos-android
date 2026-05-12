#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/speypos-local/logs/runtime"
WAKE_LOCK_STATE_FILE="$RUNTIME_DIR/wake-lock.state"

mkdir -p "$RUNTIME_DIR"

action="${1:-status}"

has_termux_wake_lock=0
has_termux_wake_unlock=0
if command -v termux-wake-lock >/dev/null 2>&1; then
  has_termux_wake_lock=1
fi
if command -v termux-wake-unlock >/dev/null 2>&1; then
  has_termux_wake_unlock=1
fi

set_state() {
  local value="$1"
  printf '%s\n' "$value" > "$WAKE_LOCK_STATE_FILE"
}

read_state() {
  if [[ -f "$WAKE_LOCK_STATE_FILE" ]]; then
    tr -d '[:space:]' < "$WAKE_LOCK_STATE_FILE"
  else
    printf 'unknown\n'
  fi
}

case "$action" in
  acquire)
    if (( has_termux_wake_lock == 0 )); then
      echo "Wake lock command unavailable (termux-wake-lock not found)."
      exit 2
    fi

    termux-wake-lock
    set_state "locked"
    echo "Wake lock acquired."
    ;;
  release)
    if (( has_termux_wake_unlock == 0 )); then
      echo "Wake unlock command unavailable (termux-wake-unlock not found)."
      exit 2
    fi

    termux-wake-unlock
    set_state "unlocked"
    echo "Wake lock released."
    ;;
  status)
    if (( has_termux_wake_lock == 0 || has_termux_wake_unlock == 0 )); then
      echo "wake-lock: unavailable (install termux-api package and Termux:API app)"
      exit 0
    fi

    state="$(read_state)"
    case "$state" in
      locked)
        echo "wake-lock: locked"
        ;;
      unlocked)
        echo "wake-lock: unlocked"
        ;;
      *)
        echo "wake-lock: unknown (no local state yet)"
        ;;
    esac
    ;;
  *)
    echo "Usage: $0 [acquire|release|status]"
    exit 1
    ;;
esac
