import { getDb } from '../database.js';

/**
 * Creates a new shift, marking it as 'open'.
 * @returns {number} The ID of the new shift.
 */
export function openShift() {
  const db = getDb();
  const stmt = db.prepare("INSERT INTO shifts (started_at, status) VALUES (?, 'open')");
  const result = stmt.run(new Date().toISOString());
  return result.lastInsertRowid;
}

/**
 * Closes an open shift.
 * @param {number} shiftId - The ID of the shift to close.
 */
export function closeShift(shiftId) {
  const db = getDb();
  const stmt = db.prepare("UPDATE shifts SET ended_at = ?, status = 'closed' WHERE id = ? AND status = 'open'");
  stmt.run(new Date().toISOString(), shiftId);
}

/**
 * Finds the current open shift, if any.
 * @returns {object | undefined} The open shift object or undefined.
 */
export function findOpenShift() {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM shifts WHERE status = 'open' ORDER BY started_at DESC LIMIT 1");
  return stmt.get();
}
