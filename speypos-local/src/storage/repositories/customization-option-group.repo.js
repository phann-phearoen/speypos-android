import { getDb } from '../database.js';
import { randomUUID } from 'crypto';
import { fromDb, toDb } from '../../utils/db-converter.js';

const booleanFields = ['required'];

/**
 * Retrieves all customization option groups.
 * @returns {Array<object>}
 */
export function getAll() {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM CustomizationOptionGroup ORDER BY sort_order ASC, name ASC');
  const results = stmt.all();
  return fromDb(results, booleanFields);
}

/**
 * Retrieves a single group by its ID.
 * @param {string} id
 * @returns {object}
 */
export function getById(id) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM CustomizationOptionGroup WHERE id = ?');
  const result = stmt.get(id);
  return fromDb(result, booleanFields);
}

/**
 * Creates a new customization option group.
 * @param {object} data
 * @returns {object} The newly created group.
 */
export function create(data) {
  const db = getDb();
  const dbData = toDb(data, booleanFields);
  const { name, selection_type, required, sort_order, default_option_id } = dbData;
  const id = randomUUID();
  const created_at = Date.now();

  const stmt = db.prepare(
    'INSERT INTO CustomizationOptionGroup (id, name, selection_type, required, sort_order, created_at, default_option_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  stmt.run(id, name, selection_type, required, sort_order, created_at, default_option_id);
  return getById(id);
}

/**
 * Updates an existing group.
 * @param {string} id
 * @param {object} data
 * @returns {object} The updated group.
 */
export function update(id, data) {
  const db = getDb();
  const dbData = toDb(data, booleanFields);
  dbData.updated_at = Date.now();

  const fields = Object.keys(dbData);
  const values = Object.values(dbData);

  if (fields.length === 0) {
    return getById(id);
  }

  const setClause = fields.map((field) => `${field} = ?`).join(', ');
  const stmt = db.prepare(`UPDATE CustomizationOptionGroup SET ${setClause} WHERE id = ?`);
  stmt.run(...values, id);
  return getById(id);
}

/**
 * Deletes a group.
 * @param {string} id
 * @returns {import('better-sqlite3').RunResult}
 */
export function remove(id) {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM CustomizationOptionGroup WHERE id = ?');
  return stmt.run(id);
}
