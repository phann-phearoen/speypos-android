import { getDb } from '../database.js';
import { randomUUID } from 'crypto';

/**
 * Creates a new mapping between a menu category and a customization group.
 * @param {object} mapData - Must contain menu_category_id and customization_group_id.
 * @returns {object} The newly created mapping.
 */
export function createMap(mapData) {
  const db = getDb();
  const { menu_category_id, customization_group_id } = mapData;
  const id = randomUUID();
  const stmt = db.prepare(
    'INSERT INTO MenuCategoryCustomizationGroup (id, menu_category_id, customization_group_id) VALUES (?, ?, ?)'
  );
  stmt.run(id, menu_category_id, customization_group_id);
  const newMap = db.prepare('SELECT * FROM MenuCategoryCustomizationGroup WHERE id = ?').get(id);
  return newMap;
}

/**
 * Deletes a mapping by its ID.
 * @param {string} id - The ID of the mapping to delete.
 * @returns {import('better-sqlite3').RunResult}
 */
export function remove(id) {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM MenuCategoryCustomizationGroup WHERE id = ?');
  return stmt.run(id);
}

/**
 * Retrieves mappings, filterable by menu_category_id or customization_group_id.
 * @param {object} filters
 * @returns {Array<object>}
 */
export function getMaps(filters = {}) {
  const db = getDb();
  let query = 'SELECT * FROM MenuCategoryCustomizationGroup';
  const params = [];
  const conditions = [];

  if (filters.menu_category_id) {
    conditions.push('menu_category_id = ?');
    params.push(filters.menu_category_id);
  }
  if (filters.customization_group_id) {
    conditions.push('customization_group_id = ?');
    params.push(filters.customization_group_id);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  const stmt = db.prepare(query);
  return stmt.all(...params);
}