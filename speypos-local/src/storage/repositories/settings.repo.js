import { getDb } from '../database.js';
import { randomUUID } from 'crypto';

/**
 * Retrieves all settings from the database.
 * @returns {Array<object>} A list of all settings.
 */
export function getAllSettings() {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM Settings ORDER BY category, key');
  return stmt.all();
}

/**
 * Retrieves a single setting by its key.
 * @param {string} key - The key of the setting.
 * @returns {object | undefined} The setting object or undefined if not found.
 */
export function getSettingByKey(key) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM Settings WHERE key = ?');
  return stmt.get(key);
}

/**
 * Inserts or updates a setting.
 * @param {object} settingData - The data for the setting.
 * @returns {object} The upserted setting.
 */
export function upsertSetting(settingData) {
  const db = getDb();
  const { key, value, value_type, category, description } = settingData;

  // Check if the setting exists to determine if it's an insert or update
  const existing = getSettingByKey(key);
  const now = Date.now();

  if (existing) {
    // Update existing setting
    const stmt = db.prepare(
      'UPDATE Settings SET value = ?, value_type = ?, category = ?, description = ?, updated_at = ? WHERE key = ?'
    );
    stmt.run(value, value_type, category, description, now, key);
  } else {
    // Insert new setting
    const stmt = db.prepare(
      'INSERT INTO Settings (id, key, value, value_type, category, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    stmt.run(randomUUID(), key, value, value_type, category, description, now);
  }

  return getSettingByKey(key);
}

/**
 * Deletes a setting by its key.
 * @param {string} key - The key of the setting to delete.
 * @returns {import('better-sqlite3').RunResult} The result of the delete operation.
 */
export function deleteSetting(key) {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM Settings WHERE key = ?');
  return stmt.run(key);
}
