#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
LOCAL_DIR="$ROOT_DIR/speypos-local"
RUNTIME_DIR="$LOCAL_DIR/logs/runtime"
BOOT_HOOK_DIR="$HOME/.termux/boot"

log() { echo "[setup] $*"; }
ok()  { echo "[setup] ✓ $*"; }
warn(){ echo "[setup] ! $*"; }

log "SpeyPOS Termux setup starting..."
log "Root: $ROOT_DIR"

# ── 1. Required Termux packages ───────────────────────────────────────────────
log "Installing required packages (node, npm, curl)..."
if command -v pkg >/dev/null 2>&1; then
  pkg install -y nodejs npm curl
  ok "Packages installed."
else
  warn "'pkg' not found. Are you running this inside Termux?"
  warn "Install nodejs, npm, and curl manually then re-run setup."
fi

# ── 2. Node dependencies ───────────────────────────────────────────────────────
log "Installing Node.js dependencies..."
npm --prefix "$LOCAL_DIR" install
ok "npm install complete."

# ── 3. Data directories ───────────────────────────────────────────────────────
log "Creating data directories..."
mkdir -p \
  "$LOCAL_DIR/data/images/menu" \
  "$LOCAL_DIR/data/images/category" \
  "$LOCAL_DIR/data/images/staff" \
  "$LOCAL_DIR/data/receipts" \
  "$LOCAL_DIR/data/seeds" \
  "$LOCAL_DIR/logs/runtime" \
  "$LOCAL_DIR/public"
ok "Directories ready."

# ── 4. Environment file ────────────────────────────────────────────────────────
ENV_FILE="$LOCAL_DIR/.env"
EXAMPLE_FILE="$LOCAL_DIR/.env.example"
if [[ -f "$ENV_FILE" ]]; then
  warn ".env already exists — skipping copy. Edit it manually if needed."
else
  if [[ -f "$EXAMPLE_FILE" ]]; then
    cp "$EXAMPLE_FILE" "$ENV_FILE"
    ok "Copied .env.example → .env. Edit $ENV_FILE before starting."
  else
    warn ".env.example not found. Create $ENV_FILE manually."
  fi
fi

# ── 5. Termux:Boot hook ────────────────────────────────────────────────────────
BOOT_SCRIPT="$ROOT_DIR/scripts/termux/boot.sh"
if [[ ! -d "$BOOT_HOOK_DIR" ]]; then
  mkdir -p "$BOOT_HOOK_DIR"
fi

BOOT_LINK="$BOOT_HOOK_DIR/speypos.sh"
if [[ -e "$BOOT_LINK" ]]; then
  warn "Termux:Boot hook already exists at $BOOT_LINK — skipping."
else
  cp "$BOOT_SCRIPT" "$BOOT_LINK"
  chmod +x "$BOOT_LINK"
  ok "Termux:Boot hook installed at $BOOT_LINK."
fi

chmod +x "$BOOT_SCRIPT"
chmod +x "$ROOT_DIR/scripts/termux/start.sh"
chmod +x "$ROOT_DIR/scripts/termux/stop.sh"
chmod +x "$ROOT_DIR/scripts/termux/restart.sh"
chmod +x "$ROOT_DIR/scripts/termux/status.sh"
chmod +x "$ROOT_DIR/scripts/termux/logs.sh"
chmod +x "$ROOT_DIR/scripts/termux/watchdog.sh"
ok "All scripts marked executable."

# ── 6. Summary ────────────────────────────────────────────────────────────────
echo ""
echo "Setup complete. Next steps:"
echo "  1. Edit $ENV_FILE with your PORT, DB_PATH, and other settings."
echo "  2. Run: bash $ROOT_DIR/scripts/termux/start.sh"
echo "  3. Install Termux:Boot app from F-Droid to enable auto-start on device boot."
