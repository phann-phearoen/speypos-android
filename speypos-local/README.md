# SpeyPOS

SpeyPOS is a local, offline-first POS (Point of Sale) backend service designed for coffee shops. It runs directly on a Windows 10 POS machine, ensuring that core business operations continue even without an internet connection.

## Core Principles

- **Offline-First**: The system is designed to work completely offline. Internet is only required for cloud sync, which runs in background mini-batches and on final shift-close flush. The local SQLite database is the absolute source of truth.
- **POS-Grade Reliability**: Built to be resilient. It can recover from crashes and power loss without losing confirmed orders. All critical data is written to disk before any external action (like printing a receipt) is taken.
- **Windows Target**: While developed on macOS, the primary deployment target is a standard Windows 10 x64 machine. All filesystem and hardware interactions are designed with Windows compatibility in mind.

## Development vs. Production

### Production Environment (Windows 10)

- The service runs as a background process.
- It interacts with a local SQLite database file.
- It connects to a physical receipt printer.
- Data is synced to a cloud backend in background mini-batches during an active shift, with a final flush at shift close.

### Development Environment (macOS / Windows)

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

    # Printer
    PRINTER_NAME="POS-80C" # Example for a real printer on Windows
    # For development, you can use a special value like "CONSOLE"
    # PRINTER_NAME="CONSOLE"

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
