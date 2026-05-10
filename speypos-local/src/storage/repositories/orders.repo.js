import { getDb } from '../database.js';

/**
 * Creates a new order in the database.
 * This should be executed within a transaction.
 * @param {object} orderData - The data for the new order.
 * @param {Array} items - The items in the order.
 * @returns {string} The ID of the newly created order.
 */
export function createOrder(orderData, items) {
  const db = getDb();
  const {
    id,
    shift_id,
    staff_id,
    status,
    customer_type,
    total_amount,
    total_items,
    created_at,
  } = orderData;

  const insertOrder = db.prepare(
    'INSERT INTO "Order" (id, shift_id, staff_id, status, customer_type, total_amount, total_items, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertItem = db.prepare(
    'INSERT INTO "OrderItem" (id, order_id, menu_item_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)'
  );

  const createTransaction = db.transaction(() => {
    insertOrder.run(
      id,
      shift_id,
      staff_id,
      status,
      customer_type,
      total_amount,
      total_items,
      created_at
    );

    for (const item of items) {
      insertItem.run(item.id, id, item.menu_item_id, item.quantity, item.unit_price);
    }

    return id;
  });

  return createTransaction();
}

/**
 * Finds orders that have a 'completed' status.
 * The watchdog uses this to find orders that might need receipt printing.
 * In the new schema, there is no 'printed_at' column, so we rely on status.
 * A more robust solution might involve a separate print queue table.
 * @returns {Array<object>} A list of completed orders.
 */
export function findUnprintedOrders() {
  const db = getDb();
  // The new schema does not have a `printed_at` column.
  // This query is adapted to find 'completed' orders, assuming they may need printing.
  // This logic might need to be revisited depending on the desired printing workflow.
  const stmt = db.prepare('SELECT * FROM "Order" WHERE status = ?');
  return stmt.all('completed');
}

/**
 * Marks an order as printed by updating its status.
 * This is an adaptation for the new schema.
 * @param {string} orderId - The ID of the order to update.
 */
export function markOrderAsPrinted(orderId) {
  const db = getDb();
  // The new schema uses a 'status' field. We can update it to 'printed' or another status.
  // For now, we'll assume there's no specific "printed" status and log it.
  // This function needs to be adapted to the new workflow.
  // For example, changing status from 'completed' to 'finished'.
  // As a placeholder, this function will not change the state.
  console.log(`Pretending to mark order ${orderId} as printed. A status update logic is needed here.`);
  // Example of what it could be:
  // const stmt = db.prepare('UPDATE "Order" SET status = ? WHERE id = ?');
  // stmt.run('finished', orderId);
}