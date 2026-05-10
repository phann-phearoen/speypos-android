import { getDb } from '../database.js';

/**
 * Creates a new mapping between a menu item and a category.
 * @param {object} mapData - Must contain menu_item_id and menu_category_id.
 * @returns {object} The newly created mapping.
 */
export function createMenuItemCategoryMap(mapData) {
  const db = getDb();
  const { id, menu_item_id, menu_category_id } = mapData;
  const stmt = db.prepare(
    'INSERT INTO MenuItemCategoryMap (id, menu_item_id, menu_category_id) VALUES (?, ?, ?)'
  );
  stmt.run(id, menu_item_id, menu_category_id);
  const newMap = db.prepare('SELECT * FROM MenuItemCategoryMap WHERE id = ?').get(id);
  return newMap;
}

/**
 * Deletes a mapping by its ID.
 * @param {string} id - The ID of the mapping to delete.
 * @returns {import('better-sqlite3').RunResult} The result of the delete operation.
 */
export function deleteMenuItemCategoryMap(id) {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM MenuItemCategoryMap WHERE id = ?');
  return stmt.run(id);
}

/**
 * Retrieves mappings. Can be filtered by menu_item_id or menu_category_id.
 * @param {object} filters - e.g., { menu_item_id: '...' }
 * @returns {Array<object>} A list of mappings.
 */
export function getMenuItemCategoryMaps(filters = {}) {
  const db = getDb();
  let query = 'SELECT * FROM MenuItemCategoryMap';
  const params = [];
  const conditions = [];

  if (filters.menu_item_id) {
    conditions.push('menu_item_id = ?');
    params.push(filters.menu_item_id);
  }
  if (filters.menu_category_id) {
    conditions.push('menu_category_id = ?');
    params.push(filters.menu_category_id);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  const stmt = db.prepare(query);
  return stmt.all(...params);
}

/**
 * Retrieves all mappings for a given list of menu item IDs.
 * @param {Array<string>} itemIds - An array of menu item IDs.
 * @returns {Array<object>} A list of mappings.
 */
export function getMappingsByItemIds(itemIds) {
  if (!itemIds || itemIds.length === 0) {
    return [];
  }
  const db = getDb();
  // Create placeholders for the IN clause, e.g., (?, ?, ?)
  const placeholders = itemIds.map(() => '?').join(',');
  const stmt = db.prepare(`SELECT * FROM MenuItemCategoryMap WHERE menu_item_id IN (${placeholders})`);
  return stmt.all(...itemIds);
}
