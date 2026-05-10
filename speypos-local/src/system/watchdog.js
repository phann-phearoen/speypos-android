import { logger } from '../utils/logger.js';
import * as recoveryService from '../services/recovery.service.js';

/**
 * Runs recovery checks on system startup.
 * This is crucial for recovering from crashes or power loss.
 */
export async function runRecoveryChecks() {
  logger.info('Watchdog: Running startup recovery checks...');
  await recoveryService.retryUnprintedOrders();
  logger.info('Watchdog: Recovery checks complete.');
}
