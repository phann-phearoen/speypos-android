import { getDb } from '../database.js';

/**
 * Retrieves all menu categories from the database.
 * @returns {Array<object>} A list of all menu categories.
 */
export function getAllMenuCategories() {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM MenuCategory ORDER BY created_at DESC');
  return stmt.all();
}

/**
 * Retrieves a single menu category by its ID.
 * @param {string} id - The ID of the menu category.
 * @returns {object} The menu category object or undefined if not found.
 */
export function getMenuCategoryById(id) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM MenuCategory WHERE id = ?');
  return stmt.get(id);
}

/**
 * Creates a new menu category.
 * @param {object} categoryData - The data for the new category.
 * @returns {object} The newly created menu category.
 */
export function createMenuCategory(categoryData) {
  const db = getDb();
  const { id, name, image_url, created_at, sort_order } = categoryData;
  const stmt = db.prepare(
    'INSERT INTO MenuCategory (id, name, image_url, created_at, sort_order) VALUES (?, ?, ?, ?, ?)'
  );
  stmt.run(id, name, image_url, created_at, sort_order);
  return getMenuCategoryById(id);
}

/**
 * Updates an existing menu category with partial data.
 * @param {string} id - The ID of the menu category to update.
 * @param {object} categoryData - An object containing the fields to update.
 * @returns {object} The updated menu category.
 */
export function updateMenuCategory(id, categoryData) {
  const db = getDb();

  const fields = Object.keys(categoryData);
  const values = Object.values(categoryData);

  if (fields.length === 0) {
    return getMenuCategoryById(id); // Nothing to update
  }

  const setClause = fields.map((field) => `${field} = ?`).join(', ');
  const stmt = db.prepare(
    `UPDATE MenuCategory SET ${setClause} WHERE id = ?`
  );

  stmt.run(...values, id);
  return getMenuCategoryById(id);
}

/**
 * Deletes a menu category.
 * @param {string} id - The ID of the menu category to delete.
 * @returns {import('better-sqlite3').RunResult} The result of the delete operation.
 */
export function deleteMenuCategory(id) {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM MenuCategory WHERE id = ?');
  return stmt.run(id);
}
