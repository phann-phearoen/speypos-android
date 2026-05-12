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
import { readQueue } from '../sync/queue.js';

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
    const printerPending = recoveryService.getPrinterPendingMetrics();
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
      printerPending,
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

export async function getReadinessStatus(req, res) {
  try {
    const runtime = getRuntimeStatus();
    const unprintedOrders = recoveryService.getUnprintedOrders();
    const printerPending = recoveryService.getPrinterPendingMetrics();
    const unreportedOrders = recoveryService.getUnreportedOrders();
    const unreportedShifts = recoveryService.getUnreportedShifts();

    let queue = [];
    let queueError = null;

    try {
      queue = await readQueue();
    } catch (error) {
      queueError = error;
      logger.error('Readiness check could not read sync queue.', {
        error: error.message,
      });
    }

    const now = Date.now();
    const queueSummary = queue.reduce(
      (acc, job) => {
        const retryCount = Number(job.retry_count || 0);
        const nextAttemptAt = job.next_attempt_at || null;
        const nextAttemptMs = nextAttemptAt ? Date.parse(nextAttemptAt) : Number.NaN;

        if (!Number.isNaN(nextAttemptMs) && nextAttemptMs > now) {
          acc.delayedJobs += 1;
        } else {
          acc.readyJobs += 1;
        }

        if (retryCount > acc.maxRetryCount) {
          acc.maxRetryCount = retryCount;
        }

        if (!acc.oldestJobCreatedAt || (job.created_at && job.created_at < acc.oldestJobCreatedAt)) {
          acc.oldestJobCreatedAt = job.created_at || acc.oldestJobCreatedAt;
        }

        if (nextAttemptAt && (!acc.nextAttemptAt || nextAttemptAt < acc.nextAttemptAt)) {
          acc.nextAttemptAt = nextAttemptAt;
        }

        return acc;
      },
      {
        totalJobs: queue.length,
        readyJobs: 0,
        delayedJobs: 0,
        maxRetryCount: 0,
        oldestJobCreatedAt: null,
        nextAttemptAt: null,
      }
    );

    const blockingReasons = [];

    if (runtime.startupPhase !== 'ready') {
      blockingReasons.push(`startup_phase_${runtime.startupPhase}`);
    }

    if (runtime.recoveryRunning) {
      blockingReasons.push('recovery_running');
    }

    if (queueError) {
      blockingReasons.push('sync_queue_unavailable');
    }

    const ready = blockingReasons.length === 0;

    res.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'not_ready',
      ready,
      timestamp: new Date().toISOString(),
      blockingReasons,
      runtime,
      pendingActions: {
        unprintedOrdersCount: unprintedOrders.count,
        printerPending,
        unreportedOrdersCount: unreportedOrders.count,
        unreportedShiftsCount: unreportedShifts.count,
      },
      syncQueue: {
        ...queueSummary,
        queueAccessible: !queueError,
        error: queueError?.message || null,
      },
    });
  } catch (error) {
    logger.error('Failed to compute readiness status', { error: error.message });
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
        const printRetry = await recoveryService.retryUnprintedOrders({ context: 'manual' });
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
