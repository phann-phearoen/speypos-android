import { startServer, stopServer } from '../server/httpServer.js';
import { initializeDatabase, closeDatabase } from '../storage/database.js';
import { initializeSettings, getBoolean } from '../services/settings.service.js';
import { initializeStore, getStore } from '../services/store.service.js';
import { initializeStoreTimezone } from '../services/time.service.js';
import { logger } from '../utils/logger.js';
import { runRecoveryChecks } from './watchdog.js';
import { processSyncQueue } from '../sync/syncManager.js';
import { setStartupPhase } from './runtimeStatus.js';

/**
 * Initializes all system components in the correct order.
 */
export async function initialize() {
  setStartupPhase('initializing');
  logger.info('System lifecycle: Initializing...');

  // 1. Initialize Database
  initializeDatabase();

  // 2. Initialize Store Service (loads store identity)
  initializeStore();

  // 3. Initialize Timezone Service (loads store timezone for date calculations)
  initializeStoreTimezone();

  // 4. Initialize Settings Service (loads defaults and DB values)
  initializeSettings();

  // 5. Determine server mode
  const isInitialized = getBoolean('system.initialized');
  const mode = isInitialized ? 'NORMAL' : 'SETUP';

  if (mode === 'NORMAL') {
    // 6. Critical check: Ensure store exists in normal mode
    if (!getStore()) {
      throw new Error(
        'CRITICAL: Store is not configured. The system cannot start in NORMAL mode without a store. Please run setup.'
      );
    }

    // 7. Run Watchdog/Recovery Checks only in normal mode
    await runRecoveryChecks();
  } else {
    setStartupPhase('setup_mode');
  }

  // 8. Start HTTP Server in the determined mode
  await startServer({ mode });

  // 8b. Kick off cloud sync queue processing in the background
  process.nextTick(processSyncQueue);

  setStartupPhase('ready');
  logger.info('System lifecycle: Initialization complete.');
}

/**
 * Shuts down all system components gracefully.
 */
export async function shutdown() {
  setStartupPhase('shutting_down');
  logger.info('System lifecycle: Shutting down...');

  // 1. Stop HTTP Server (stops accepting new requests)
  await stopServer();

  // 2. Close Database Connection
  closeDatabase();

  logger.info('System lifecycle: Shutdown complete.');
}
