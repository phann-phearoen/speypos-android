import { getDb } from '../database.js';

/**
 * Retrieves all menu items from the database.
 * @returns {Array<object>} A list of all menu items.
 */
export function getAllMenuItems() {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM MenuItem ORDER BY created_at DESC');
  return stmt.all();
}

/**
 * Retrieves a single menu item by its ID.
 * @param {string} id - The ID of the menu item.
 * @returns {object} The menu item object or undefined if not found.
 */
export function getMenuItemById(id) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM MenuItem WHERE id = ?');
  return stmt.get(id);
}

/**
 * Creates a new menu item.
 * @param {object} itemData - The data for the new item.
 * @returns {object} The newly created menu item.
 */
export function createMenuItem(itemData) {
  const db = getDb();
  const { id, name, image_url, price, created_at } = itemData;
  const stmt = db.prepare(
    'INSERT INTO MenuItem (id, name, image_url, price, created_at) VALUES (?, ?, ?, ?, ?)'
  );
  stmt.run(id, name, image_url, price, created_at);
  return getMenuItemById(id);
}

/**
 * Updates an existing menu item with partial data.
 * @param {string} id - The ID of the menu item to update.
 * @param {object} itemData - An object containing the fields to update.
 * @returns {object} The updated menu item.
 */
export function updateMenuItem(id, itemData) {
  const db = getDb();

  // Automatically set the update timestamp
  itemData.updated_at = Date.now();

  const fields = Object.keys(itemData);
  const values = Object.values(itemData);

  if (fields.length === 0) {
    return getMenuItemById(id); // Nothing to update
  }

  const setClause = fields.map((field) => `${field} = ?`).join(', ');
  const stmt = db.prepare(
    `UPDATE MenuItem SET ${setClause} WHERE id = ?`
  );

  stmt.run(...values, id);
  return getMenuItemById(id);
}

/**
 * Deletes a menu item.
 * @param {string} id - The ID of the menu item to delete.
 * @returns {import('better-sqlite3').RunResult} The result of the delete operation.
 */
export function deleteMenuItem(id) {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM MenuItem WHERE id = ?');
  return stmt.run(id);
}