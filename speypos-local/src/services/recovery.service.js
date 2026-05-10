import * as orderRepo from '../storage/repositories/order.repo.js';
import * as shiftRepo from '../storage/repositories/shift.repo.js';
import * as printerService from '../printer/printerService.js';
import * as telegramService from './telegram.service.js';
import { logger } from '../utils/logger.js';
import { serializeOrder } from '../serializers/order.serializer.js';
import { ORDER_STATUS } from '../constants/order.constants.js';

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
export async function retryUnprintedOrders() {
  const { records } = getUnprintedOrders();
  if (records.length === 0) {
    return { succeeded: 0, failed: 0, total: 0 };
  }

  logger.info(`Starting retry job for ${records.length} unprinted orders.`);
  let succeeded = 0;
  for (const shallowOrder of records) {
    try {
      // Fetch the full, detailed order object as required by the printer service
      const order = orderRepo.getOrderById(shallowOrder.id);
      if (!order) {
        logger.warn(`Could not find order ${shallowOrder.id} during print retry. Skipping.`);
        continue;
      }
      if (![ORDER_STATUS.COMPLETED, ORDER_STATUS.VOIDED].includes(order.status)) {
        logger.info(`Skipping print retry for order ${order.id} in status ${order.status}.`);
        continue;
      }
      const fullOrder = serializeOrder(order);
      // The printReceipt function is idempotent and will handle the check and update
      await printerService.printReceipt(fullOrder);
      succeeded++;
    } catch (error) {
      logger.error(
        `Retry job for unprinted orders failed on order ${shallowOrder.id}. Stopping job.`,
        { error: error.message }
      );
      // Stop on first failure
      break;
    }
  }
  const total = records.length;
  logger.info(
    `Finished retry job for unprinted orders. Succeeded: ${succeeded}, Failed: ${total - succeeded}`
  );
  return { succeeded, failed: total - succeeded, total };
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
