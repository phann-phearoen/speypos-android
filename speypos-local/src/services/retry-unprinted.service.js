import { ORDER_STATUS } from '../constants/order.constants.js';

/**
 * Runs the retry flow for unprinted orders with injected dependencies.
 * This keeps retry semantics testable without hard-coupling to storage or printer modules.
 */
export async function runRetryUnprintedOrders({
  records,
  getOrderById,
  serializeOrder,
  printReceipt,
  logger,
  maxAttempts,
  stopOnFirstError = true,
  context = 'manual',
}) {
  const total = Array.isArray(records) ? records.length : 0;
  const maxAttemptsPerRun = Number.isInteger(maxAttempts) && maxAttempts > 0
    ? maxAttempts
    : total;

  if (total === 0) {
    return {
      context,
      total: 0,
      attempted: 0,
      succeeded: 0,
      failed: 0,
      skippedMissing: 0,
      skippedIneligibleStatus: 0,
      remaining: 0,
      capped: false,
      stoppedReason: 'none',
      lastError: null,
    };
  }

  logger.info(`Starting retry job for ${total} unprinted orders.`, {
    context,
    maxAttemptsPerRun,
    stopOnFirstError,
  });

  let attempted = 0;
  let succeeded = 0;
  let failed = 0;
  let skippedMissing = 0;
  let skippedIneligibleStatus = 0;
  let stoppedReason = 'none';
  let lastError = null;

  for (const shallowOrder of records) {
    if (attempted >= maxAttemptsPerRun) {
      stoppedReason = 'max_attempts_reached';
      break;
    }

    try {
      const order = getOrderById(shallowOrder.id);
      if (!order) {
        logger.warn(`Could not find order ${shallowOrder.id} during print retry. Skipping.`);
        skippedMissing += 1;
        continue;
      }

      if (![ORDER_STATUS.COMPLETED, ORDER_STATUS.VOIDED].includes(order.status)) {
        logger.info(`Skipping print retry for order ${order.id} in status ${order.status}.`);
        skippedIneligibleStatus += 1;
        continue;
      }

      const fullOrder = serializeOrder(order);
      attempted += 1;
      await printReceipt(fullOrder);
      succeeded++;
    } catch (error) {
      failed += 1;
      lastError = {
        orderId: shallowOrder.id,
        message: error.message,
      };

      logger.error(
        `Retry job for unprinted orders failed on order ${shallowOrder.id}.`,
        {
          context,
          error: error.message,
          stopOnFirstError,
        }
      );

      if (stopOnFirstError) {
        stoppedReason = 'first_error';
        break;
      }
    }
  }

  const processed = succeeded + failed + skippedMissing + skippedIneligibleStatus;
  const remaining = Math.max(total - processed, 0);
  const capped = stoppedReason === 'max_attempts_reached';

  logger.info(
    'Finished retry job for unprinted orders.',
    {
      context,
      total,
      attempted,
      succeeded,
      failed,
      skippedMissing,
      skippedIneligibleStatus,
      remaining,
      capped,
      stoppedReason,
      lastError,
    }
  );

  return {
    context,
    total,
    attempted,
    succeeded,
    failed,
    skippedMissing,
    skippedIneligibleStatus,
    remaining,
    capped,
    stoppedReason,
    lastError,
  };
}
