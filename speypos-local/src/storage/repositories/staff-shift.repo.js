import { getDb } from '../database.js';

/**
 * Creates a new mapping between a staff member and a shift.
 * @param {object} mapData - Must contain shift_id and staff_id.
 * @returns {object} The newly created mapping.
 */
export function createStaffShiftMap(mapData) {
  const db = getDb();
  const { id, shift_id, staff_id } = mapData;
  const stmt = db.prepare(
    'INSERT INTO StaffShift (id, shift_id, staff_id) VALUES (?, ?, ?)'
  );
  stmt.run(id, shift_id, staff_id);
  const newMap = db.prepare('SELECT * FROM StaffShift WHERE id = ?').get(id);
  return newMap;
}

/**
 * Deletes a mapping by its ID.
 * @param {string} id - The ID of the mapping to delete.
 * @returns {import('better-sqlite3').RunResult} The result of the delete operation.
 */
export function deleteStaffShiftMap(id) {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM StaffShift WHERE id = ?');
  return stmt.run(id);
}

/**
 * Retrieves mappings. Can be filtered by shift_id or staff_id.
 * @param {object} filters - e.g., { shift_id: '...' }
 * @returns {Array<object>} A list of mappings.
 */
export function getStaffShiftMaps(filters = {}) {
  const db = getDb();
  let query = 'SELECT * FROM StaffShift';
  const params = [];
  const conditions = [];

  if (filters.shift_id) {
    if (Array.isArray(filters.shift_id)) {
      if (filters.shift_id.length === 0) {
        // If an empty array is passed, no shifts can match.
        conditions.push('1 = 0');
      } else {
        const placeholders = filters.shift_id.map(() => '?').join(',');
        conditions.push(`shift_id IN (${placeholders})`);
        params.push(...filters.shift_id);
      }
    } else {
      // Handle a single ID
      conditions.push('shift_id = ?');
      params.push(filters.shift_id);
    }
  }
  if (filters.staff_id) {
    conditions.push('staff_id = ?');
    params.push(filters.staff_id);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  const stmt = db.prepare(query);
  return stmt.all(...params);
}
