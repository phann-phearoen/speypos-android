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
}) {
  if (!Array.isArray(records) || records.length === 0) {
    return { succeeded: 0, failed: 0, total: 0 };
  }

  logger.info(`Starting retry job for ${records.length} unprinted orders.`);

  let succeeded = 0;
  for (const shallowOrder of records) {
    try {
      const order = getOrderById(shallowOrder.id);
      if (!order) {
        logger.warn(`Could not find order ${shallowOrder.id} during print retry. Skipping.`);
        continue;
      }

      if (![ORDER_STATUS.COMPLETED, ORDER_STATUS.VOIDED].includes(order.status)) {
        logger.info(`Skipping print retry for order ${order.id} in status ${order.status}.`);
        continue;
      }

      const fullOrder = serializeOrder(order);
      await printReceipt(fullOrder);
      succeeded++;
    } catch (error) {
      logger.error(
        `Retry job for unprinted orders failed on order ${shallowOrder.id}. Stopping job.`,
        { error: error.message }
      );
      break;
    }
  }

  const total = records.length;
  logger.info(
    `Finished retry job for unprinted orders. Succeeded: ${succeeded}, Failed: ${total - succeeded}`
  );

  return { succeeded, failed: total - succeeded, total };
}
