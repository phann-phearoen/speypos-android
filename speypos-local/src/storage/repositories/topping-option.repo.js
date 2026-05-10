import { getDb } from '../database.js';
import { randomUUID } from 'crypto';

/**
 * Retrieves all topping options, with optional filtering.
 * @param {object} filters - e.g., { topping_group_id: '...' }
 * @returns {Array<object>}
 */
export function getAll(filters = {}) {
  const db = getDb();
  let query = 'SELECT * FROM ToppingOption';
  const params = [];
  const conditions = [];

  if (filters.topping_group_id) {
    conditions.push('topping_group_id = ?');
    params.push(filters.topping_group_id);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY sort_order ASC, label ASC';

  const stmt = db.prepare(query);
  return stmt.all(...params);
}

/**
 * Retrieves a single topping option by its ID.
 * @param {string} id
 * @returns {object}
 */
export function getById(id) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM ToppingOption WHERE id = ?');
  return stmt.get(id);
}

/**
 * Creates a new topping option.
 * @param {object} data
 * @returns {object} The newly created option.
 */
export function create(data) {
  const db = getDb();
  const {
    topping_group_id,
    label,
    unit_label = 'qty',
    unit_price = 0,
    min_quantity = 0,
    max_quantity = null,
    step_quantity = 1,
    sort_order = 0,
  } = data;
  const id = randomUUID();
  const created_at = Date.now();

  const stmt = db.prepare(
    'INSERT INTO ToppingOption (id, topping_group_id, label, unit_label, unit_price, min_quantity, max_quantity, step_quantity, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  stmt.run(
    id,
    topping_group_id,
    label,
    unit_label,
    unit_price,
    min_quantity,
    max_quantity,
    step_quantity,
    sort_order,
    created_at
  );
  return getById(id);
}

/**
 * Updates an existing topping option.
 * @param {string} id
 * @param {object} data
 * @returns {object} The updated option.
 */
export function update(id, data) {
  const db = getDb();
  data.updated_at = Date.now();

  const fields = Object.keys(data);
  const values = Object.values(data);

  if (fields.length === 0) {
    return getById(id);
  }

  const setClause = fields.map((field) => `${field} = ?`).join(', ');
  const stmt = db.prepare(`UPDATE ToppingOption SET ${setClause} WHERE id = ?`);
  stmt.run(...values, id);
  return getById(id);
}

/**
 * Deletes a topping option.
 * @param {string} id
 * @returns {import('better-sqlite3').RunResult}
 */
export function remove(id) {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM ToppingOption WHERE id = ?');
  return stmt.run(id);
}
