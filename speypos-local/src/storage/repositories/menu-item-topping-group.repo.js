import { getDb } from '../database.js';
import { randomUUID } from 'crypto';

/**
 * Creates a new mapping between a menu item and a topping group.
 * @param {object} mapData - Must contain menu_item_id and topping_group_id.
 * @returns {object} The newly created mapping.
 */
export function createMap(mapData) {
  const db = getDb();
  const { menu_item_id, topping_group_id } = mapData;
  const id = randomUUID();
  const stmt = db.prepare(
    'INSERT INTO MenuItemToppingGroup (id, menu_item_id, topping_group_id) VALUES (?, ?, ?)'
  );
  stmt.run(id, menu_item_id, topping_group_id);
  const newMap = db.prepare('SELECT * FROM MenuItemToppingGroup WHERE id = ?').get(id);
  return newMap;
}

/**
 * Deletes a mapping by its ID.
 * @param {string} id - The ID of the mapping to delete.
 * @returns {import('better-sqlite3').RunResult}
 */
export function remove(id) {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM MenuItemToppingGroup WHERE id = ?');
  return stmt.run(id);
}

/**
 * Retrieves mappings, filterable by menu_item_id or topping_group_id.
 * @param {object} filters
 * @returns {Array<object>}
 */
export function getMaps(filters = {}) {
  const db = getDb();
  let query = 'SELECT * FROM MenuItemToppingGroup';
  const params = [];
  const conditions = [];

  if (filters.menu_item_id) {
    conditions.push('menu_item_id = ?');
    params.push(filters.menu_item_id);
  }
  if (filters.topping_group_id) {
    conditions.push('topping_group_id = ?');
    params.push(filters.topping_group_id);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  const stmt = db.prepare(query);
  return stmt.all(...params);
}
