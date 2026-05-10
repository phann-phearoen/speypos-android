import * as orderRepo from '../storage/repositories/order.repo.js';
import * as paymentRepo from '../storage/repositories/payment.repo.js';
import { printReceipt } from '../printer/printerService.js';
import { logger } from '../utils/logger.js';
import { sendOrderNotification } from '../services/telegram.service.js';
import * as recoveryService from '../services/recovery.service.js';
import { serializeOrder } from '../serializers/order.serializer.js';
import { ORDER_STATUS, ORDER_VOID_REASONS } from '../constants/order.constants.js';
import { maybeEnqueueMiniBatchForActiveShift } from '../sync/syncManager.js';

/**
 * Handles the request to get all orders.
 */
export function getOrders(req, res) {
  try {
    const { shift_id, staff_id } = req.query;
    const filters = {};
    if (shift_id) {
      filters.shift_id = shift_id;
    }
    if (staff_id) {
      filters.staff_id = staff_id;
    }
    const orders = orderRepo.getAllOrders(filters);
    const serializedOrders = orders.map(serializeOrder);
    res.status(200).json(serializedOrders);
  } catch (error) {
    logger.error('Failed to get orders', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to get a single order by its ID.
 */
export function getOrder(req, res) {
  try {
    const { id } = req.params;
    const order = orderRepo.getOrderById(id);
    if (order) {
      res.status(200).json(serializeOrder(order));
    } else {
      res.status(404).json({ error: `Order with ID ${id} not found` });
    }
  } catch (error) {
    logger.error('Failed to get order', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to create a new order.
 */
export function createOrder(req, res) {
  try {
    const { shift_id, staff_id, items } = req.body;
    console.log('Order data: ', req.body);
    if (!shift_id || !staff_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: shift_id, staff_id, and a non-empty items array',
      });
    }

    const newOrder = orderRepo.createOrder(req.body);
    res.status(201).json(serializeOrder(newOrder));
  } catch (error) {
    logger.error('Failed to create order', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to create a payment for an order.
 */
export async function createPayment(req, res) {
  try {
    const { id } = req.params;
    const { payment_type, amount } = req.body;

    if (!payment_type || amount === undefined) {
      return res.status(400).json({ error: 'Missing required fields: payment_type and amount' });
    }

    const order = orderRepo.getOrderById(id);
    if (!order) {
      return res.status(404).json({ error: `Order with ID ${id} not found` });
    }
    if (order.status !== ORDER_STATUS.PENDING) {
      return res
        .status(409)
        .json({ error: `Order is not in 'pending' state. Current status: ${order.status}` });
    }

    const updatedOrder = serializeOrder(paymentRepo.createPaymentForOrder(id, req.body));

    // Await the initial notification to ensure it finishes before we retry others
    await sendOrderNotification(updatedOrder).catch((err) => {
      logger.warn(
        `Initial Telegram notification failed for order ${updatedOrder.id}. It will be retried later.`,
        { error: err.message }
      );
    });

    // Now that the initial attempt is done, trigger a retry pass for any OTHER pending jobs.
    recoveryService.retryUnreportedTelegrams();
    // Trigger cloud mini-batch enqueue checks in the background.
    maybeEnqueueMiniBatchForActiveShift().catch((err) => {
      logger.warn('Failed to enqueue cloud mini-batch after payment completion', {
        error: err.message,
      });
    });

    res.status(200).json(updatedOrder);
  } catch (error) {
    logger.error(`Failed to create payment for order ${req.params.id}`, {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to print a receipt for an order.
 */
export async function printOrderReceipt(req, res) {
  try {
    const { id } = req.params;
    const order = orderRepo.getOrderById(id);

    if (!order) {
      return res.status(404).json({ error: `Order with ID ${id} not found` });
    }

    // Allow printing for completed or voided orders. Others are blocked.
    if (![ORDER_STATUS.COMPLETED, ORDER_STATUS.VOIDED].includes(order.status)) {
      return res.status(409).json({
        error: `Cannot print receipt for an order that is not completed or voided. Current status: ${order.status}`,
      });
    }

    const fullOrder = serializeOrder(order);
    await printReceipt(fullOrder);

    // After a successful print, trigger a retry pass for any other pending print jobs.
    recoveryService.retryUnprintedOrders();

    res.status(200).json({ message: 'Receipt has been sent to the printer.' });
  } catch (error) {
    logger.error(`Failed to print receipt for order ${req.params.id}`, {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Marks an order as voided with a reason and optional note.
 */
export async function voidOrder(req, res) {
  try {
    const { id } = req.params;
    const { void_reason, void_note, voided_by } = req.body;

    if (!void_reason || !ORDER_VOID_REASONS.includes(void_reason)) {
      return res.status(400).json({
        error: `void_reason is required and must be one of: ${ORDER_VOID_REASONS.join(', ')}`,
      });
    }

    const order = orderRepo.getOrderById(id);
    if (!order) {
      return res.status(404).json({ error: `Order with ID ${id} not found` });
    }

    if (order.status === ORDER_STATUS.VOIDED) {
      return res.status(409).json({ error: 'Order is already voided.' });
    }

    const updatedOrder = serializeOrder(
      orderRepo.voidOrder(id, { void_reason, void_note, voided_by })
    );

    // Send void notification, but do not block response on failure.
    await sendOrderNotification(updatedOrder).catch((err) => {
      logger.warn(`Telegram void notification failed for order ${updatedOrder.id}`, {
        error: err.message,
      });
    });

    // Trigger cloud mini-batch enqueue checks in the background.
    maybeEnqueueMiniBatchForActiveShift().catch((err) => {
      logger.warn('Failed to enqueue cloud mini-batch after order void', {
        error: err.message,
      });
    });

    // Trigger retries for other pending jobs (prints/telegrams)
    recoveryService.retryUnreportedTelegrams();
    recoveryService.retryUnprintedOrders();

    res.status(200).json(updatedOrder);
  } catch (error) {
    logger.error(`Failed to void order ${req.params.id}`, {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
