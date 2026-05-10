import { getDb } from '../database.js';
import { randomUUID } from 'crypto';
import { ORDER_STATUS } from '../../constants/order.constants.js';

/**
 * Retrieves a single order row by ID.
 * @param {string} id - The ID of the order.
 * @returns {object | undefined} The order row or undefined if not found.
 */
export function getOrderById(id) {
  const db = getDb();
  const orderStmt = db.prepare('SELECT * FROM "Order" WHERE id = ?');
  return orderStmt.get(id);
}

/**
 * Finds the single active order in the system.
 * The "active" order is the most recent one with a 'pending' status.
 * @returns {object | undefined} The active order row or undefined.
 */
export function findActiveOrder() {
  const db = getDb();
  const activeOrderStmt = db.prepare(
    `SELECT id FROM "Order" WHERE status = 'pending' ORDER BY created_at DESC LIMIT 1`
  );
  const activeOrder = activeOrderStmt.get();

  if (!activeOrder) {
    return undefined;
  }

  return getOrderById(activeOrder.id);
}

/**
 * Retrieves a list of all orders.
 * Does not include nested items for performance.
 * @returns {Array<object>} A list of order objects.
 */
export function getAllOrders(filters = {}) {
  const db = getDb();
  let query = 'SELECT * FROM "Order"';
  const params = [];
  const conditions = [];

  if (filters.shift_id) {
    conditions.push('shift_id = ?');
    params.push(filters.shift_id);
  }
  if (filters.staff_id) {
    conditions.push('staff_id = ?');
    params.push(filters.staff_id);
  }

  if (filters.unsyncedOnly) {
    conditions.push('cloud_sync_at IS NULL');
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC';

  const stmt = db.prepare(query);
  return stmt.all(...params);
}

/**
 * Retrieves all orders for a given shift, optionally filtered to unsynced orders.
 * @param {string} shiftId - The shift identifier.
 * @param {{ unsyncedOnly?: boolean }} options
 * @returns {Array<object>}
 */
export function getOrdersForShift(shiftId, options = {}) {
  const filters = { shift_id: shiftId };
  if (options.unsyncedOnly) {
    filters.unsyncedOnly = true;
  }
  return getAllOrders(filters);
}

/**
 * Counts finalized (completed/voided) orders for a shift that have not been synced to cloud.
 * @param {string} shiftId
 * @returns {number}
 */
export function countFinalizedUnsyncedByShift(shiftId) {
  const db = getDb();
  const stmt = db.prepare(
    `SELECT COUNT(*) AS count
     FROM "Order"
     WHERE shift_id = ?
       AND cloud_sync_at IS NULL
       AND status IN (?, ?)`
  );
  const row = stmt.get(shiftId, ORDER_STATUS.COMPLETED, ORDER_STATUS.VOIDED);
  return row?.count || 0;
}

/**
 * Retrieves finalized unsynced orders for a shift in ascending chronological order.
 * @param {string} shiftId
 * @param {{ limit?: number }} options
 * @returns {Array<object>}
 */
export function getFinalizedUnsyncedByShift(shiftId, options = {}) {
  const db = getDb();
  const params = [shiftId, ORDER_STATUS.COMPLETED, ORDER_STATUS.VOIDED];

  let query = `
    SELECT *
    FROM "Order"
    WHERE shift_id = ?
      AND cloud_sync_at IS NULL
      AND status IN (?, ?)
    ORDER BY created_at ASC, id ASC
  `;

  if (Number.isInteger(options.limit) && options.limit > 0) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }

  const stmt = db.prepare(query);
  return stmt.all(...params);
}

/**
 * Creates a new order with all its items and customizations in a single transaction.
 * Assumes all monetary values from the client are already integers in the smallest currency unit (e.g., cents).
 * @param {object} orderData - The full order payload from the client.
 * @returns {object} The newly created order row.
 */
export function createOrder(orderData) {
  const db = getDb();
  const { shift_id, staff_id, customer_type, items = [] } = orderData;

  const transaction = db.transaction(() => {
    // 1. Create the Order record
    const orderId = randomUUID();
    const total_items = items.reduce((sum, item) => sum + item.quantity, 0);

    // Total is derived from unit_price, which already includes customizations/toppings.
    const total_amount = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

    const orderStmt = db.prepare(
      'INSERT INTO "Order" (id, shift_id, staff_id, status, customer_type, total_amount, total_items, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    // Orders start as 'pending' until paid
    orderStmt.run(
      orderId,
      shift_id,
      staff_id,
      ORDER_STATUS.PENDING,
      customer_type,
      total_amount,
      total_items,
      Date.now()
    );

    // 2. Create OrderItem and OrderCustomization records
    const itemStmt = db.prepare(
      'INSERT INTO OrderItem (id, order_id, menu_item_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)'
    );
    const custStmt = db.prepare(
      'INSERT INTO OrderCustomization (id, order_item_id, name, option_type, value, price) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const toppingStmt = db.prepare(
      'INSERT INTO OrderItemTopping (id, order_item_id, topping_option_id, name, unit_label, unit_price, quantity, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );

    for (const item of items) {
      const orderItemId = randomUUID();
      // Use unit_price directly as it's assumed to be an integer
      itemStmt.run(orderItemId, orderId, item.menu_item_id, item.quantity, item.unit_price);

      if (item.customizations && item.customizations.length > 0) {
        for (const cust of item.customizations) {
          // Use customization price directly
          custStmt.run(
            randomUUID(),
            orderItemId,
            cust.name,
            cust.option_type,
            cust.value,
            cust.price
          );
        }
      }

      if (item.toppings && item.toppings.length > 0) {
        for (const topping of item.toppings) {
          const unit_label = topping.unit_label || 'qty';
          const unit_price = topping.unit_price || 0;
          const quantity = topping.quantity || 0;
          const total_price = topping.total_price ?? unit_price * quantity;
          toppingStmt.run(
            randomUUID(),
            orderItemId,
            topping.topping_option_id,
            topping.name,
            unit_label,
            unit_price,
            quantity,
            total_price
          );
        }
      }
    }

    return orderId;
  });

  const newOrderId = transaction();
  return getOrderById(newOrderId);
}

/**
 * Finds all orders that have not been printed yet.
 * @returns {Array<object>} A list of unprinted orders.
 */
export function findUnprinted() {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM "Order" WHERE printed_at IS NULL');
  return stmt.all();
}

/**
 * Marks an order as printed by setting the current timestamp.
 * @param {string} id - The ID of the order to update.
 * @returns {object} The updated order row.
 */
export function markAsPrinted(id) {
  const db = getDb();
  const stmt = db.prepare('UPDATE "Order" SET printed_at = unixepoch() WHERE id = ?');
  stmt.run(id);
  return getOrderById(id);
}

/**
 * Finds all orders that have not been reported to Telegram yet.
 * @returns {Array<object>} A list of unreported orders.
 */
export function findUnreportedForTelegram() {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM "Order" WHERE telegram_reported_at IS NULL');
  return stmt.all();
}

/**
 * Marks an order as voided with metadata. Also clears print/telegram flags so downstream flows can run.
 * @param {string} id - The ID of the order to void.
 * @param {{ void_reason: string, void_note?: string, voided_by?: string }} voidData
 * @returns {object} The updated order row.
 */
export function voidOrder(id, voidData) {
  const db = getDb();
  const { void_reason, void_note, voided_by } = voidData;
  const voided_at = Date.now();

  const transaction = db.transaction(() => {
    const stmt = db.prepare(
      `UPDATE "Order"
       SET status = ?,
           void_reason = ?,
           void_note = ?,
           voided_at = ?,
           voided_by = ?,
           printed_at = NULL,
           telegram_reported_at = NULL
       WHERE id = ?`
    );

    stmt.run(ORDER_STATUS.VOIDED, void_reason, void_note || null, voided_at, voided_by || null, id);

    return getOrderById(id);
  });

  return transaction();
}

/**
 * Marks an order as reported to Telegram by setting the current timestamp.
 * @param {string} id - The ID of the order to update.
 * @returns {object} The updated order row.
 */
export function markAsTelegramReported(id) {
  const db = getDb();
  const stmt = db.prepare('UPDATE "Order" SET telegram_reported_at = unixepoch() WHERE id = ?');
  stmt.run(id);
  return getOrderById(id);
}

/**
 * Marks a list of orders as synced to the cloud by setting the current timestamp.
 * @param {Array<string>} orderIds
 */
export function markOrdersSynced(orderIds = []) {
  if (!orderIds.length) {
    return;
  }

  const db = getDb();
  const stmt = db.prepare('UPDATE "Order" SET cloud_sync_at = ? WHERE id = ?');
  const now = Date.now();

  const transaction = db.transaction((ids) => {
    for (const id of ids) {
      stmt.run(now, id);
    }
  });

  transaction(orderIds);
}
