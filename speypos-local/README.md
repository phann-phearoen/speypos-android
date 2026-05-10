# SpeyPOS

SpeyPOS is a local, offline-first POS (Point of Sale) backend service designed for coffee shops. It runs on an Android device using Termux, ensuring that core business operations continue even without an internet connection.

## Core Principles

- **Offline-First**: The system is designed to work completely offline. Internet is only required for cloud sync, which runs in background mini-batches and on final shift-close flush. The local SQLite database is the absolute source of truth.
- **POS-Grade Reliability**: Built to be resilient. It can recover from crashes and power loss without losing confirmed orders. All critical data is written to disk before any external action (like printing a receipt) is taken.
- **Android Termux Target**: The primary deployment target is Android via Termux with a watchdog-based runtime. Lifecycle operations are managed through the Termux scripts in the workspace root.

## Development vs. Production

### Production Environment (Android + Termux)

- The service runs as a background process.
- It interacts with a local SQLite database file.
- During Refactor 1, printer output runs in temporary `CONSOLE` mode.
- Data is synced to a cloud backend in background mini-batches during an active shift, with a final flush at shift close.

Operational commands (from workspace root):

```sh
npm run termux:start
npm run termux:status
npm run termux:logs
npm run termux:restart
npm run termux:stop
```

Enable LAN printer transport (backend-only in Refactor 2):

1. Keep `FORCE_CONSOLE_PRINTER=false` in `.env`.
2. Update `printer.lan` setting via API:

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

Backend helper commands:

```sh
npm run printer:lan:get
npm run printer:lan:set -- --host=192.168.1.50 --port=9100 --timeout=5000 --profile=default --enabled=true
npm run printer:lan:test
npm run printer:lan:disable
```

Refactor 2 integration checks:

```sh
npm run test:refactor2
```

### Development Environment (macOS / Android)

- Run the service using `npm run dev` for automatic restarts on file changes.
- Environment variables are loaded from a `.env` file (not committed to git).
- Printer output can be mocked to log to the console instead of a physical device.

## Getting Started

1.  **Install Node.js**: Make sure you have Node.js version 18. Use `nvm` or `nvs` for easy version management.

    ```sh
    nvm use
    ```

2.  **Install Dependencies**:

    ```sh
    npm install
    ```

3.  **Configure Environment**:
    Create a `.env` file in the root directory. See `src/config/env.js` for required variables.
    Example `.env`:

    ```env
    # Server
    PORT=8080

    # Database
    DB_PATH=./database/pos.sqlite

    # Runtime
    RUNTIME_PROFILE=android-termux
    FORCE_CONSOLE_PRINTER=true

    # Printer runtime switch
    # true: force console output
    # false: use printer.lan setting when enabled
    FORCE_CONSOLE_PRINTER=true

    # Telegram Notifications (Optional)
    TELEGRAM_BOT_TOKEN="your_bot_token_here"
    TELEGRAM_CHAT_ID="your_chat_id_here"

    # Cloud Sync Mini-Batch
    # Optional. Defaults to 20 when omitted.
    # Valid range: 1..200
    SYNC_MINI_BATCH_SIZE=20
    ```

4.  **Run the application**:
    ```sh
    npm start
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
