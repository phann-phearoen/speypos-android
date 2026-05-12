import * as orderRepo from '../storage/repositories/order.repo.js';
import * as shiftRepo from '../storage/repositories/shift.repo.js';
import * as printerService from '../printer/printerService.js';
import * as telegramService from './telegram.service.js';
import { logger } from '../utils/logger.js';
import { serializeOrder } from '../serializers/order.serializer.js';
import { runRetryUnprintedOrders } from './retry-unprinted.service.js';

function parseInteger(value, fallback, { min, max }) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return fallback;
  }
  return parsed;
}

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function parseOrderCreatedAtMs(order) {
  const raw = order?.created_at ?? order?.createdAt ?? null;
  if (raw === null || raw === undefined) {
    return null;
  }

  const asNumber = Number(raw);
  if (!Number.isFinite(asNumber)) {
    return null;
  }

  // Most rows store unixepoch seconds; convert to ms while remaining safe for ms values.
  return asNumber < 1_000_000_000_000 ? asNumber * 1000 : asNumber;
}

/**
 * Scans for all orders that have not been successfully printed.
 * @returns {{count: number, records: Array<object>}}
 */
export function getUnprintedOrders() {
  try {
    const records = orderRepo.findUnprinted();
    return {
      count: records.length,
      records,
    };
  } catch (error) {
    logger.error('Failed to scan for unprinted orders', { error: error.message });
    return { count: 0, records: [] };
  }
}

/**
 * Scans for all orders that have not been reported to Telegram.
 * @returns {{count: number, records: Array<object>}}
 */
export function getUnreportedOrders() {
  try {
    const records = orderRepo.findUnreportedForTelegram();
    return {
      count: records.length,
      records,
    };
  } catch (error) {
    logger.error('Failed to scan for unreported orders', { error: error.message });
    return { count: 0, records: [] };
  }
}

/**
 * Scans for all shifts that have not been reported to Telegram.
 * @returns {{count: number, records: Array<object>}}
 */
export function getUnreportedShifts() {
  try {
    const records = shiftRepo.findUnreportedForTelegram();
    return {
      count: records.length,
      records,
    };
  } catch (error) {
    logger.error('Failed to scan for unreported shifts', { error: error.message });
    return { count: 0, records: [] };
  }
}

/**
 * Attempts to print all currently unprinted order receipts.
 * Processes sequentially and stops on the first failure.
 * @returns {Promise<{succeeded: number, failed: number, total: number}>}
 */
export function getPrinterPendingMetrics() {
  const { count, records } = getUnprintedOrders();
  const nowMs = Date.now();

  let oldestPendingAt = null;
  let oldestPendingAgeMinutes = null;

  for (const order of records) {
    const createdAtMs = parseOrderCreatedAtMs(order);
    if (!createdAtMs) {
      continue;
    }

    if (!oldestPendingAt || createdAtMs < Date.parse(oldestPendingAt)) {
      oldestPendingAt = new Date(createdAtMs).toISOString();
      oldestPendingAgeMinutes = Math.max(0, Math.floor((nowMs - createdAtMs) / 60000));
    }
  }

  const staleThresholdMinutes = parseInteger(
    process.env.PRINT_PENDING_STALE_MINUTES,
    10,
    { min: 1, max: 1440 }
  );

  const staleOrderCount = records.reduce((acc, order) => {
    const createdAtMs = parseOrderCreatedAtMs(order);
    if (!createdAtMs) {
      return acc;
    }

    const ageMinutes = Math.floor((nowMs - createdAtMs) / 60000);
    return ageMinutes >= staleThresholdMinutes ? acc + 1 : acc;
  }, 0);

  return {
    pendingCount: count,
    staleOrderCount,
    staleThresholdMinutes,
    oldestPendingAt,
    oldestPendingAgeMinutes,
  };
}

export async function retryUnprintedOrders({ context = 'manual' } = {}) {
  const { records } = getUnprintedOrders();

  const maxAttemptsPerRun = parseInteger(
    process.env.PRINT_RETRY_MAX_ATTEMPTS_PER_RUN,
    30,
    { min: 1, max: 500 }
  );
  const stopOnFirstError = parseBoolean(process.env.PRINT_RETRY_STOP_ON_ERROR, true);

  return runRetryUnprintedOrders({
    records,
    getOrderById: orderRepo.getOrderById,
    serializeOrder,
    printReceipt: printerService.printReceipt,
    logger,
    maxAttempts: maxAttemptsPerRun,
    stopOnFirstError,
    context,
  });
}

/**
 * Attempts to send Telegram reports for all unreported orders and shifts.
 * Processes sequentially and stops on the first failure of each type.
 * @returns {Promise<{orders: object, shifts: object}>}
 */
export async function retryUnreportedTelegrams() {
  const { records: unreportedOrders } = getUnreportedOrders();
  const { records: unreportedShifts } = getUnreportedShifts();

  const orderResults = { succeeded: 0, failed: 0, total: unreportedOrders.length };
  const shiftResults = { succeeded: 0, failed: 0, total: unreportedShifts.length };

  if (unreportedOrders.length > 0) {
    logger.info(`Starting retry job for ${unreportedOrders.length} unreported orders.`);
    for (const flatOrder of unreportedOrders) {
      try {
        // Fetch the full, detailed order object as required by the formatter
        const order = orderRepo.getOrderById(flatOrder.id);
        if (!order) {
          logger.warn(`Could not find order ${flatOrder.id} during retry. Skipping.`);
          continue;
        }
        const fullOrder = serializeOrder(order);
        await telegramService.sendOrderNotification(fullOrder, { isRetry: true });
        orderResults.succeeded++;
      } catch (error) {
        logger.error(`Retry job for unreported orders failed on order ${flatOrder.id}. Stopping.`, {
          error: error.message,
        });
        break;
      }
    }
    orderResults.failed = unreportedOrders.length - orderResults.succeeded;
    logger.info(
      `Finished retry job for unreported orders. Succeeded: ${orderResults.succeeded}, Failed: ${orderResults.failed}`
    );
  }

  if (unreportedShifts.length > 0) {
    logger.info(`Starting retry job for ${unreportedShifts.length} unreported shifts.`);
    for (const shift of unreportedShifts) {
      try {
        // sendShiftCloseNotification requires the full shift report object
        const shiftReport = shiftRepo.getShiftSalesReport(shift.id);
        if (shiftReport) {
          await telegramService.sendShiftCloseNotification(shiftReport, { isRetry: true });
          shiftResults.succeeded++;
        } else {
          logger.warn(
            `Could not generate shift report for shift ${shift.id} during retry. Skipping.`
          );
        }
      } catch (error) {
        logger.error(`Retry job for unreported shifts failed on shift ${shift.id}. Stopping.`, {
          error: error.message,
        });
        break;
      }
    }
    shiftResults.failed = unreportedShifts.length - shiftResults.succeeded;
    logger.info(
      `Finished retry job for unreported shifts. Succeeded: ${shiftResults.succeeded}, Failed: ${shiftResults.failed}`
    );
  }

  return { orders: orderResults, shifts: shiftResults };
}
