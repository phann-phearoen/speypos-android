import * as recoveryService from "../services/recovery.service.js";
import { isSystemInitialized } from '../services/setup.service.js';
import { logger } from "../utils/logger.js";
import { shutdown } from '../system/lifecycle.js';
import {
  getRuntimeStatus,
  setRecoveryRunning,
  recordRecoveryResult,
  recordRecoveryError,
  setDegradedReasons,
} from '../system/runtimeStatus.js';

const REBOOT_EXIT_CODE = 75;

function buildDegradedSignals(unprintedOrders, unreportedOrders, unreportedShifts) {
  const reasons = [];

  if (unprintedOrders.count > 0) {
    reasons.push('unprinted_orders_pending');
  }

  if (unreportedOrders.count > 0 || unreportedShifts.count > 0) {
    reasons.push('telegram_reports_pending');
  }

  return reasons;
}

/**
 * Handles the request to get the system's initialization status.
 */
export function getSetupStatus(req, res) {
  try {
    const isInitialized = isSystemInitialized();
    res.status(200).json({ initialized: isInitialized });
  } catch (error) {
    logger.error("Failed to get setup status", { error: error.message });
    res.status(500).json({ error: "Internal Server Error" });
  }
}

/**
 * Handles the request to reboot the server.
 * Responds immediately and then triggers a graceful shutdown.
 */
export function reboot(req, res) {
  res.status(200).json({ message: 'Server is shutting down for a reboot.' });

  logger.info('Reboot requested. Triggering graceful shutdown in 1 second...');
  setTimeout(async () => {
    try {
      await shutdown();
    } catch (error) {
      logger.error('Error during reboot shutdown flow.', { error: error.message });
    } finally {
      logger.info(`Exiting process for reboot with code ${REBOOT_EXIT_CODE}.`);
      process.exit(REBOOT_EXIT_CODE);
    }
  }, 1000);
}

/**
 * Handles the request to get the status of pending side-effects (actions).
 */
export function getPendingActionsStatus(req, res) {
  try {
    const unprintedOrders = recoveryService.getUnprintedOrders();
    const unreportedOrders = recoveryService.getUnreportedOrders();
    const unreportedShifts = recoveryService.getUnreportedShifts();
    const runtime = getRuntimeStatus();

    const pendingReasons = buildDegradedSignals(
      unprintedOrders,
      unreportedOrders,
      unreportedShifts
    );
    const degradedReasons = Array.from(new Set([
      ...runtime.degradedReasons,
      ...pendingReasons,
    ]));

    setDegradedReasons(degradedReasons, 'pending_actions_scan');

    const healthState = runtime.recoveryRunning || runtime.startupPhase === 'recovering'
      ? 'recovering'
      : degradedReasons.length > 0
        ? 'degraded'
        : 'healthy';

    res.status(200).json({
      hasUnprintedOrders: unprintedOrders.count > 0,
      unprintedOrdersCount: unprintedOrders.count,
      hasUnreportedOrders: unreportedOrders.count > 0,
      unreportedOrdersCount: unreportedOrders.count,
      hasUnreportedShifts: unreportedShifts.count > 0,
      unreportedShiftsCount: unreportedShifts.count,
      isDegraded: healthState === 'degraded',
      healthState,
      degradedReasons,
      recoveryRunning: runtime.recoveryRunning,
      startupPhase: runtime.startupPhase,
    });
  } catch (error) {
    logger.error("Failed to get pending actions status", {
      error: error.message,
    });
    res.status(500).json({ error: "Internal Server Error" });
  }
}

export function getRuntimeStatusSnapshot(req, res) {
  try {
    const runtime = getRuntimeStatus();
    res.status(200).json(runtime);
  } catch (error) {
    logger.error('Failed to get runtime status', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to manually trigger retry jobs.
 */
export async function runRetryJobs(req, res) {
  try {
    // Run jobs sequentially in background; return 202 immediately.
    setRecoveryRunning(true, 'manual');

    process.nextTick(async () => {
      try {
        const printRetry = await recoveryService.retryUnprintedOrders();
        const telegramRetry = await recoveryService.retryUnreportedTelegrams();
        recordRecoveryResult({
          context: 'manual',
          printRetry,
          telegramRetry,
        });
      } catch (error) {
        recordRecoveryError(error, 'manual');
        logger.error('Background retry jobs failed.', { error: error.message });
      } finally {
        setRecoveryRunning(false, 'manual');
      }
    });

    res.status(202).json({ message: "Retry jobs have been triggered." });
  } catch (error) {
    logger.error("Failed to trigger retry jobs", { error: error.message });
    res.status(500).json({ error: "Internal Server Error" });
  }
}
