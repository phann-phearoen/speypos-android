import { getDb } from '../database.js';
import { randomUUID } from 'crypto';
import { logger } from '../../utils/logger.js';
import { getNowInStoreTime } from '../../services/time.service.js';

/**
 * Retrieves all shifts from the database.
 * @returns {Array<object>} A list of all shifts.
 */
export function getAllShifts(filters = {}) {
  const db = getDb();
  let query = 'SELECT * FROM Shift';
  const params = [];
  const conditions = [];

  if (filters.date) {
    conditions.push('date = ?');
    params.push(filters.date);
  }

  if (filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY started_at ASC';
  const stmt = db.prepare(query);
  return stmt.all(...params);
}

/**
 * Retrieves a single shift by its ID.
 * @param {string} id - The ID of the shift.
 * @returns {object} The shift object or undefined if not found.
 */
export function getShiftById(id) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM Shift WHERE id = ?');
  return stmt.get(id);
}

/**
 * Resolves the active shift for the store-local current business date.
 * If multiple rows are open for the same date, the most recently started shift is used.
 * @returns {object | undefined}
 */
export function getActiveShiftForNow() {
  const db = getDb();
  const { todayStoreDate } = getNowInStoreTime();
  const stmt = db.prepare(
    `SELECT *
     FROM Shift
     WHERE status = 'open' AND date = ?
     ORDER BY started_at DESC, id DESC
     LIMIT 1`
  );
  return stmt.get(todayStoreDate);
}

/**
 * Returns true when the shift exists and is closed.
 * @param {string} shiftId
 * @returns {boolean}
 */
export function isShiftClosed(shiftId) {
  const shift = getShiftById(shiftId);
  return !!shift && shift.status === 'closed';
}

/**
 * Creates a new shift.
 * @param {object} shiftData - The data for the new shift.
 * @returns {object} The newly created shift.
 */
export function createShift(shiftData) {
  const db = getDb();
  const { id, status, started_at, ended_at, date } = shiftData;
  const stmt = db.prepare(
    'INSERT INTO Shift (id, status, started_at, ended_at, date) VALUES (?, ?, ?, ?, ?)'
  );
  stmt.run(id, status, started_at, ended_at, date);
  return getShiftById(id);
}

/**
 * Updates an existing shift with partial data.
 * @param {string} id - The ID of the shift to update.
 * @param {object} shiftData - An object containing the fields to update.
 * @returns {object} The updated shift.
 */
export function updateShift(id, shiftData) {
  const db = getDb();

  const fields = Object.keys(shiftData);
  const values = Object.values(shiftData);

  if (fields.length === 0) {
    return getShiftById(id);
  }

  const setClause = fields.map((field) => `${field} = ?`).join(', ');
  const stmt = db.prepare(`UPDATE Shift SET ${setClause} WHERE id = ?`);

  stmt.run(...values, id);
  return getShiftById(id);
}

/**
 * Deletes a shift.
 * @param {string} id - The ID of the shift to delete.
 * @returns {import('better-sqlite3').RunResult} The result of the delete operation.
 */
export function deleteShift(id) {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM Shift WHERE id = ?');
  return stmt.run(id);
}

/**
 * Creates a new shift and assigns a staff member to it in a single transaction.
 * @param {string} staffId The ID of the staff member opening the shift.
 * @param {object} shiftData The data for the new shift (e.g., date).
 * @returns {object} The newly created shift object.
 */
export function openShiftForStaff(staffId) {
  const db = getDb();
  const { utcDate, todayStoreDate } = getNowInStoreTime();
  const started_at = utcDate.getTime(); // Store pure UTC timestamp
  const date = todayStoreDate; // Use the store's 'YYYY-MM-DD'

  const transaction = db.transaction(() => {
    // 1. Create the Shift
    const shiftId = randomUUID();
    const createShiftStmt = db.prepare(
      'INSERT INTO Shift (id, status, started_at, ended_at, date) VALUES (?, ?, ?, ?, ?)'
    );
    createShiftStmt.run(shiftId, 'open', started_at, null, date);

    // 2. Create the StaffShift mapping
    const createMapStmt = db.prepare(
      'INSERT INTO StaffShift (id, shift_id, staff_id) VALUES (?, ?, ?)'
    );
    createMapStmt.run(randomUUID(), shiftId, staffId);

    return shiftId;
  });

  const newShiftId = transaction();
  return getShiftById(newShiftId);
}

/**
 * Finds all closed shifts that have not been reported to Telegram yet.
 * @returns {Array<object>} A list of unreported shifts.
 */
export function findUnreportedForTelegram() {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM Shift WHERE telegram_reported_at IS NULL AND status = ?');
  return stmt.all('closed');
}

/**
 * Marks a shift as reported to Telegram by setting the current timestamp.
 * @param {string} id - The ID of the shift to update.
 * @returns {object} The updated shift.
 */
export function markAsTelegramReported(id) {
  const db = getDb();
  const stmt = db.prepare('UPDATE Shift SET telegram_reported_at = unixepoch() WHERE id = ?');
  stmt.run(id);
  return getShiftById(id);
}

/**
 * Generates a sales report for a given shift.
 * @param {string} shiftId - The ID of the shift.
 * @returns {object} An object containing the report data.
 */
export function getShiftSalesReport(shiftId) {
  const db = getDb();

  // 1. Get the shift details
  const shift = getShiftById(shiftId);
  if (!shift) {
    // In a real app, you might throw an error, but returning null is also an option
    // if the controller is prepared to handle it.
    logger.warn(`Shift with ID ${shiftId} not found when generating sales report.`);
    return null;
  }

  // 2. Get all completed orders for the shift to calculate revenue
  const ordersStmt = db.prepare(`
    SELECT o.status, o.total_amount, o.total_items, p.payment_type
    FROM "Order" o
    LEFT JOIN Payment p ON o.id = p.order_id
    WHERE o.shift_id = ? AND o.status IN ('completed', 'voided')
  `);
  const orders = ordersStmt.all(shiftId);

  const completedOrders = orders.filter((order) => order.status === 'completed');
  const voidedOrders = orders.filter((order) => order.status === 'voided');

  // 3. Calculate totals
  const totalOrders = completedOrders.length;
  const totalRevenue = completedOrders.reduce((sum, order) => sum + order.total_amount, 0);
  const totalItems = completedOrders.reduce((sum, order) => sum + order.total_items, 0);

  const voidedAmount = voidedOrders.reduce((sum, order) => sum + order.total_amount, 0);
  const voidedItems = voidedOrders.reduce((sum, order) => sum + order.total_items, 0);
  const netRevenue = totalRevenue - voidedAmount;

  // 4. Calculate revenue by payment type (completed orders only)
  const revenueByPaymentType = completedOrders.reduce((acc, order) => {
    const type = order.payment_type || 'unknown';
    if (!acc[type]) {
      acc[type] = 0;
    }
    acc[type] += order.total_amount;
    return acc;
  }, {});

  return {
    shift,
    totalOrders,
    totalRevenue,
    totalItems,
    revenueByPaymentType,
    voidedOrders: voidedOrders.length,
    voidedAmount,
    voidedItems,
    netRevenue,
  };
}
