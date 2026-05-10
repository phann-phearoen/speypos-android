import { getDb } from '../database.js';
import { randomUUID } from 'crypto';
import { fromDb, toDb } from '../../utils/db-converter.js';

const booleanFields = ['required'];

/**
 * Retrieves all topping groups.
 * @returns {Array<object>}
 */
export function getAll() {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM ToppingGroup ORDER BY sort_order ASC, name ASC');
  const results = stmt.all();
  return fromDb(results, booleanFields);
}

/**
 * Retrieves a single topping group by its ID.
 * @param {string} id
 * @returns {object}
 */
export function getById(id) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM ToppingGroup WHERE id = ?');
  const result = stmt.get(id);
  return fromDb(result, booleanFields);
}

/**
 * Creates a new topping group.
 * @param {object} data
 * @returns {object} The newly created group.
 */
export function create(data) {
  const db = getDb();
  const dbData = toDb(data, booleanFields);
  const { name, required, sort_order } = dbData;
  const id = randomUUID();
  const created_at = Date.now();

  const stmt = db.prepare(
    'INSERT INTO ToppingGroup (id, name, required, sort_order, created_at) VALUES (?, ?, ?, ?, ?)'
  );
  stmt.run(id, name, required, sort_order, created_at);
  return getById(id);
}

/**
 * Updates an existing topping group.
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
  const stmt = db.prepare(`UPDATE ToppingGroup SET ${setClause} WHERE id = ?`);
  stmt.run(...values, id);
  return getById(id);
}

/**
 * Deletes a topping group.
 * @param {string} id
 * @returns {import('better-sqlite3').RunResult}
 */
export function remove(id) {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM ToppingGroup WHERE id = ?');
  return stmt.run(id);
}
