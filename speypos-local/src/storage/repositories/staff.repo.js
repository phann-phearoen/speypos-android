import { getDb } from '../database.js';
import { hashPassword } from '../../utils/hash.js';

/**
 * Retrieves all staff members from the database.
 * @returns {Array<object>} A list of all staff members.
 */
export function getAllStaff() {
  const db = getDb();
  // Exclude password hash from general queries
  const stmt = db.prepare('SELECT id, name, role, status, created_at, updated_at FROM Staff ORDER BY created_at DESC');
  return stmt.all();
}

/**
 * Retrieves a single staff member by their ID (excluding password).
 * @param {string} id - The ID of the staff member.
 * @returns {object} The staff member object or undefined if not found.
 */
export function getStaffById(id) {
  const db = getDb();
  const stmt = db.prepare('SELECT id, name, role, status, created_at, updated_at FROM Staff WHERE id = ?');
  return stmt.get(id);
}

/**
 * Retrieves a single staff member by name, including the password hash for authentication.
 * @param {string} name - The name of the staff member.
 * @returns {object} The full staff member object or undefined if not found.
 */
export function getStaffByNameForAuth(name) {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM Staff WHERE name = ?');
    return stmt.get(name);
}

/**
 * Creates a new staff member.
 * @param {object} staffData - The data for the new staff member.
 * @returns {object} The newly created staff member (excluding password).
 */
export function createStaff(staffData) {
  const db = getDb();
  const { id, name, password, role, status, created_at } = staffData;
  
  const hashedPassword = hashPassword(password);

  const stmt = db.prepare(
    'INSERT INTO Staff (id, name, password, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  );
  stmt.run(id, name, hashedPassword, role, status, created_at);
  return getStaffById(id);
}

/**
 * Updates an existing staff member with partial data.
 * @param {string} id - The ID of the staff member to update.
 * @param {object} staffData - An object containing the fields to update.
 * @returns {object} The updated staff member (excluding password).
 */
export function updateStaff(id, staffData) {
  const db = getDb();
  
  // If password is being updated, hash it.
  if (staffData.password) {
    staffData.password = hashPassword(staffData.password);
  }
  staffData.updated_at = Date.now();

  const fields = Object.keys(staffData);
  const values = Object.values(staffData);

  if (fields.length === 0) {
    return getStaffById(id);
  }

  const setClause = fields.map((field) => `${field} = ?`).join(', ');
  const stmt = db.prepare(
    `UPDATE Staff SET ${setClause} WHERE id = ?`
  );

  stmt.run(...values, id);
  return getStaffById(id);
}

/**
 * Deletes a staff member.
 * @param {string} id - The ID of the staff member to delete.
 * @returns {import('better-sqlite3').RunResult} The result of the delete operation.
 */
export function deleteStaff(id) {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM Staff WHERE id = ?');
  return stmt.run(id);
}