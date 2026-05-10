import { getDb } from '../database.js';

/**
 * Gets all inventory items.
 * @returns {Array<object>} A list of all inventory items.
 */
export function getAllInventory() {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM inventory ORDER BY name');
  return stmt.all();
}

/**
 * Updates the stock for a given inventory item.
 * @param {number} itemId - The ID of the item to update.
 * @param {number} newQuantity - The new stock quantity.
 */
export function updateStock(itemId, newQuantity) {
  const db = getDb();
  const stmt = db.prepare('UPDATE inventory SET stock_quantity = ? WHERE id = ?');
  stmt.run(newQuantity, itemId);
}
