#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
PWA_DIR="$ROOT_DIR/speypos-pwa"
LOCAL_DIR="$ROOT_DIR/speypos-local"
PUBLIC_DIR="$LOCAL_DIR/public"
DIST_DIR="$PWA_DIR/dist"
DIST_INDEX="$DIST_DIR/index.html"

log() { echo "[deploy-pwa] $*"; }
ok() { echo "[deploy-pwa] ✓ $*"; }
warn() { echo "[deploy-pwa] ! $*"; }

if [[ ! -f "$PWA_DIR/package.json" ]]; then
  warn "Missing $PWA_DIR/package.json"
  warn "Cannot deploy frontend assets."
  exit 1
fi

if [[ ! -f "$LOCAL_DIR/package.json" ]]; then
  warn "Missing $LOCAL_DIR/package.json"
  warn "Cannot deploy frontend assets."
  exit 1
fi

mkdir -p "$PUBLIC_DIR"

if [[ ! -d "$PWA_DIR/node_modules" ]]; then
  log "Installing PWA dependencies..."
  npm --prefix "$PWA_DIR" install
  ok "PWA dependencies installed."
fi

need_build=0
if [[ "${TERMUX_FORCE_PWA_BUILD:-0}" == "1" ]]; then
  need_build=1
elif [[ ! -f "$DIST_INDEX" ]]; then
  need_build=1
elif [[ -n "$(find "$PWA_DIR/src" "$PWA_DIR/public" -type f -newer "$DIST_INDEX" -print -quit 2>/dev/null)" ]]; then
  need_build=1
elif [[ "$PWA_DIR/package.json" -nt "$DIST_INDEX" ]]; then
  need_build=1
fi

if (( need_build == 1 )); then
  log "Building PWA assets..."
  npm --prefix "$PWA_DIR" run build
  ok "PWA build complete."
else
  log "PWA build is up-to-date; skipping build."
fi

if [[ ! -f "$DIST_INDEX" ]]; then
  warn "Missing $DIST_INDEX after build."
  exit 1
fi

log "Syncing PWA artifacts to backend public directory..."
rm -rf "$PUBLIC_DIR"/*
cp -R "$DIST_DIR"/. "$PUBLIC_DIR"/
ok "PWA assets deployed to $PUBLIC_DIR"