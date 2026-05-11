# SpeyPOS

SpeyPOS is a local, offline-first POS (Point of Sale) backend service designed for coffee shops. It runs on an Android device using Termux, ensuring that core business operations continue even without an internet connection.

## Core Principles

- **Offline-First**: The system is designed to work completely offline. Internet is only required for cloud sync, which runs in background mini-batches and on final shift-close flush. The local SQLite database is the absolute source of truth.
- **POS-Grade Reliability**: Built to be resilient. It can recover from crashes and power loss without losing confirmed orders. All critical data is written to disk before any external action (like printing a receipt) is taken.
- **Android Termux Target**: The primary deployment target is Android via Termux with a watchdog-based runtime. Lifecycle operations are managed through the Termux scripts in the workspace root.

## Android + Termux Runbook

This project is operated on Android via Termux. Windows service workflows are not supported.

### First-Time Device Setup

Run these commands from the workspace root:

```sh
npm run termux:setup
```

What setup does:

1. Installs required Termux packages and native build toolchain.
2. Installs backend dependencies.
3. Creates required data and runtime log directories.
4. Creates `.env` from `.env.example` when missing.
5. Installs Termux:Boot hook for auto-start.

Then edit `speypos-local/.env` and verify at minimum:

```env
PORT=8080
DB_PATH=./data/pos.db
RUNTIME_PROFILE=android-termux
FORCE_CONSOLE_PRINTER=true
CORS_ORIGIN=http://localhost:8000
SYNC_MINI_BATCH_SIZE=20
# CLOUD_FETCH_TIMEOUT_MS=15000
# TELEGRAM_FETCH_TIMEOUT_MS=8000
```

### Daily Operations

All commands run from workspace root:

```sh
npm run termux:deploy
npm run termux:start
npm run termux:status
npm run termux:logs
npm run termux:restart
npm run termux:stop
```

Expected behavior:

1. `termux:deploy` builds/syncs PWA assets into `speypos-local/public`.
2. `termux:start` auto-runs the same deploy step, then launches watchdog/backend.
3. Open `http://localhost:8080` on the device browser to use the app.
4. `termux:status` reports current watchdog/backend PID state.
5. `termux:logs` tails runtime diagnostics.
6. `termux:restart` performs graceful stop/start.
7. `termux:stop` signals shutdown and waits for watchdog exit.

### Printer Operations (RAW TCP 9100)

Default safety mode on Android is console output. To enable LAN printer transport:

1. Set `FORCE_CONSOLE_PRINTER=false` in `speypos-local/.env`.
2. Configure `printer.lan`:

```sh
curl -X PUT http://localhost:8080/api/settings/printer.lan \
  -H 'Content-Type: application/json' \
  -d '{
    "value": {
      "version": 1,
      "enabled": true,
      "protocol": "raw9100",
      "host": "192.168.1.50",
      "port": 9100,
      "timeout_ms": 5000,
      "profile": "default"
    },
    "value_type": "json",
    "category": "Printing",
    "description": "LAN printer config"
  }'
```

Optional helper commands:

```sh
npm run printer:lan:get
npm run printer:lan:set -- --host=192.168.1.50 --port=9100 --timeout=5000 --profile=default --enabled=true
npm run printer:lan:test
npm run printer:lan:disable
```

### Troubleshooting

#### Printer connectivity failures

Symptoms:

1. Order completes but print job fails.
2. Logs show timeout/socket errors for RAW TCP printer.

Actions:

1. Confirm printer IP is reachable from device WiFi.
2. Confirm `printer.lan.enabled=true`, host, port `9100`, and timeout in settings.
3. Run `npm run printer:lan:test`.
4. Temporarily set `FORCE_CONSOLE_PRINTER=true` to keep POS operational while network printing is repaired.

#### App does not come back after reboot/background kill

Symptoms:

1. POS unreachable after phone reboot.
2. No active backend process in status output.

Actions:

1. Ensure Termux:Boot app is installed and battery optimizations are disabled for Termux/Termux:Boot.
2. Re-run `npm run termux:setup` to reinstall boot hook if needed.
3. Inspect `npm run termux:logs` for startup failure details.
4. Start manually with `npm run termux:start` and verify with `npm run termux:status`.

#### Startup failures

Symptoms:

1. Service exits immediately on start.
2. Repeated restart attempts in watchdog logs.

Actions:

1. Validate `.env` values (`PORT`, `DB_PATH`, `RUNTIME_PROFILE`).
2. Run `node --check speypos-local/src/index.js` for quick syntax sanity.
3. Confirm database path directory is writable.
4. If native module issues appear, re-run `npm run termux:setup` (includes build toolchain and native smoke test).

### Supported Device and Printer Matrix

| Category | Supported | Notes |
|---|---|---|
| Android runtime | Android 10+ (Termux) | Android 12+ recommended |
| CPU | ARM64 (aarch64) | 64-bit devices strongly recommended |
| Backend runtime | Node.js 22.x – 25.x (Termux) | Use `pkg install nodejs`; workspace `.npmrc` pre-defines `android_ndk_path` so native build works on Node 24/25 |
| Printer protocol | RAW TCP 9100 | Primary supported production path |
| Printer fallback | Console mode | Safe degraded mode when LAN printer is unavailable |
| Cloud sync | Optional | POS remains functional offline |

### Minimum Requirements

1. Android phone/tablet with 2 GB RAM minimum (4 GB recommended).
2. At least 500 MB free storage for app data/logs and build artifacts.
3. Stable local WiFi for LAN printing.
4. Termux and Termux:Boot installed.

## Development (macOS / Desktop)

1. Use Node.js 22+.
2. Install dependencies in `speypos-local`:

```sh
npm install
```

3. Run backend in development mode:

```sh
npm run dev
```

4. For Android-like backend behavior on desktop:

```sh
npm run start:android
```

## Project Structure

The project is organized into clear modules with distinct responsibilities:

- `src/index.js`: Main application entrypoint.
- `src/config/`: Environment and path configuration.
- `src/server/`: Localhost HTTP server for the POS frontend to communicate with.
- `src/storage/`: Database initialization, migrations, and data repositories.
- `src/printer/`: Service for connecting to and printing receipts.
- `src/sync/`: Manages the queue and transmission of data to the cloud backend.
- `src/system/`: Handles application lifecycle events like startup, shutdown, and crash recovery.
- `src/utils/`: Shared utilities like logging.
- `docs/`: Architectural and data flow documentation.
