import { logger } from '../utils/logger.js';
import * as recoveryService from '../services/recovery.service.js';
import {
  setRecoveryRunning,
  setStartupPhase,
  recordRecoveryResult,
  recordRecoveryError,
} from './runtimeStatus.js';

/**
 * Runs recovery checks on system startup.
 * This is crucial for recovering from crashes or power loss.
 */
export async function runRecoveryChecks() {
  logger.info('Watchdog: Running startup recovery checks...');
  setStartupPhase('recovering');
  setRecoveryRunning(true, 'startup');

  try {
    const printRetry = await recoveryService.retryUnprintedOrders({ context: 'startup' });
    const telegramRetry = await recoveryService.retryUnreportedTelegrams();

    recordRecoveryResult({
      context: 'startup',
      printRetry,
      telegramRetry,
    });

    logger.info('Watchdog: Recovery checks complete.');
    return { printRetry, telegramRetry };
  } catch (error) {
    recordRecoveryError(error, 'startup');
    throw error;
  } finally {
    setRecoveryRunning(false, 'startup');
  }
}
