import { getDb } from '../database.js';
import { randomUUID } from 'crypto';

function serializePaymentProfile(paymentProfile) {
  if (paymentProfile === undefined) {
    return undefined;
  }
  if (paymentProfile === null) {
    return null;
  }
  if (typeof paymentProfile === 'string') {
    return paymentProfile;
  }
  return JSON.stringify(paymentProfile);
}

function parsePaymentProfile(paymentProfile) {
  if (paymentProfile === null || paymentProfile === undefined) {
    return null;
  }
  if (typeof paymentProfile === 'object') {
    return paymentProfile;
  }
  try {
    return JSON.parse(paymentProfile);
  } catch (error) {
    throw new Error('Invalid payment_profile stored in database.');
  }
}

function normalizeStoreRecord(store) {
  if (!store) {
    return store;
  }
  return {
    ...store,
    payment_profile: parsePaymentProfile(store.payment_profile),
  };
}

/**
 * Retrieves the first store record found in the database.
 * In a single-store setup, this is the active store.
 * @returns {object | undefined} The store object or undefined if not found.
 */
export function getStore() {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM stores LIMIT 1');
  const store = stmt.get();
  return normalizeStoreRecord(store);
}

/**
 * Creates a new store record.
 * @param {object} storeData - The data for the new store.
 * @returns {object} The created store record.
 */
export function create(storeData) {
  const db = getDb();
  const { name, language, currency, timezone = 'Asia/Phnom_Penh', payment_profile } = storeData;
  const now = Date.now();
  const id = randomUUID();
  const paymentProfileValue = serializePaymentProfile(payment_profile);

  const stmt = db.prepare(
    'INSERT INTO stores (id, name, language, currency, payment_profile, created_at, timezone) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  stmt.run(id, name, language, currency, paymentProfileValue, now, timezone);

  return getStore();
}

/**
 * Updates the store record.
 * @param {object} storeData - An object containing the fields to update.
 * @returns {object} The updated store record.
 */
export function update(storeData) {
  const db = getDb();
  const now = Date.now();

  if (Object.prototype.hasOwnProperty.call(storeData, 'payment_profile')) {
    storeData.payment_profile = serializePaymentProfile(storeData.payment_profile);
  }

  const fields = Object.keys(storeData);
  const values = Object.values(storeData);

  if (fields.length === 0) {
    return getStore(); // Nothing to update
  }

  const setClause = fields.map((field) => `${field} = ?`).join(', ');

  const stmt = db.prepare(`UPDATE stores SET ${setClause}, updated_at = ?`);

  stmt.run(...values, now);

  return getStore();
}
