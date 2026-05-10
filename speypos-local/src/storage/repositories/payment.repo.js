import { getDb } from '../database.js';
import { randomUUID } from 'crypto';
import { getOrderById } from './order.repo.js';
import * as moneyService from '../../services/money.service.js';

/**
 * Creates a payment for a specific order and updates the order's status.
 * This is performed in a transaction to ensure data integrity.
 * Assumes all monetary values from the client are already integers in the smallest currency unit (e.g., cents).
 * @param {string} orderId - The ID of the order to pay for.
 * @param {object} paymentData - Data for the payment (type, amount, etc.).
 * @returns {object} The updated order row.
 */
export function createPaymentForOrder(orderId, paymentData) {
  const db = getDb();
  const { payment_type, amount, received_cash, change } = paymentData;

  const transaction = db.transaction(() => {
    // Assumes monetary inputs are already integers (cents)
    const paymentStmt = db.prepare(
      'INSERT INTO Payment (id, order_id, status, payment_type, amount, received_cash, change, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    paymentStmt.run(
      randomUUID(),
      orderId,
      'completed', // Payment status
      payment_type,
      amount,
      received_cash || null,
      change || null,
      Date.now()
    );

    // 2. Update the order status to 'completed'
    const orderUpdateStmt = db.prepare('UPDATE "Order" SET status = ? WHERE id = ?');
    orderUpdateStmt.run('completed', orderId);

    return orderId;
  });

  const updatedOrderId = transaction();
  return getOrderById(updatedOrderId);
}

/**
 * Finds a pending payment for a given order.
 * @param {string} orderId - The ID of the order.
 * @returns {object | undefined} The payment object or undefined if not found.
 */
export function findPendingPaymentForOrder(orderId) {
  const db = getDb();
  const stmt = db.prepare(
    `SELECT * FROM Payment WHERE order_id = ? AND status = 'pending' LIMIT 1`
  );
  return stmt.get(orderId);
}
