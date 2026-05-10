import * as recoveryService from "../services/recovery.service.js";
import { isSystemInitialized } from '../services/setup.service.js';
import { logger } from "../utils/logger.js";
import { shutdown } from '../system/lifecycle.js';

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
  setTimeout(() => {
    shutdown();
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

    res.status(200).json({
      hasUnprintedOrders: unprintedOrders.count > 0,
      unprintedOrdersCount: unprintedOrders.count,
      hasUnreportedOrders: unreportedOrders.count > 0,
      unreportedOrdersCount: unreportedOrders.count,
      hasUnreportedShifts: unreportedShifts.count > 0,
      unreportedShiftsCount: unreportedShifts.count,
    });
  } catch (error) {
    logger.error("Failed to get pending actions status", {
      error: error.message,
    });
    res.status(500).json({ error: "Internal Server Error" });
  }
}

/**
 * Handles the request to manually trigger retry jobs.
 */
export async function runRetryJobs(req, res) {
  try {
    // Run jobs sequentially, but don't wait for them to finish for the response
    recoveryService.retryUnprintedOrders();
    recoveryService.retryUnreportedTelegrams();

    res.status(202).json({ message: "Retry jobs have been triggered." });
  } catch (error) {
    logger.error("Failed to trigger retry jobs", { error: error.message });
    res.status(500).json({ error: "Internal Server Error" });
  }
}
