import * as storeRepo from '../storage/repositories/store.repo.js';
import { logger } from '../utils/logger.js';
import { validatePaymentProfile } from '../validators/store-payment-profile.validator.js';

// In-memory cache for the store
let storeCache = null;

/**
 * @typedef {object} CurrencyMetadata
 * @property {number} minorUnit - The number of decimal places for the currency (e.g., 2 for USD cents).
 * @property {string} symbol - The currency symbol (e.g., '$').
 */

/**
 * A map of supported currencies and their metadata.
 * @type {Object.<string, CurrencyMetadata>}
 */
const currencyMetadata = {
  USD: { minorUnit: 2, symbol: '$' },
  KHR: { minorUnit: 0, symbol: '៛' },
};

/**
 * Initializes the store service by loading the store record from the database.
 */
export function initializeStore() {
  logger.info('Initializing store service...');
  const store = storeRepo.getStore();
  if (store) {
    storeCache = store;
    logger.info(`Store "${store.name}" loaded successfully.`);
  } else {
    logger.warn('No store record found in the database.');
  }
}

/**
 * Updates the store details in the database and refreshes the cache.
 * @param {object} updateData - The data to update.
 * @returns {object} The updated store object.
 */
export function updateStore(updateData) {
  logger.info('Updating store details...');
  if (Object.prototype.hasOwnProperty.call(updateData, 'payment_profile')) {
    validatePaymentProfile(updateData.payment_profile);
  }
  const updatedStore = storeRepo.update(updateData);
  storeCache = updatedStore; // Refresh the cache
  logger.info(`Store "${updatedStore.name}" updated successfully.`);
  return updatedStore;
}

/**
 * Retrieves the full cached store object.
 * @returns {object | null} The store object or null if not loaded.
 */
export function getStore() {
  return storeCache;
}

/**
 * Retrieves the store's language code.
 * @returns {string | undefined} The language code (e.g., 'en') or undefined.
 */
export function getLanguage() {
  return storeCache?.language;
}

/**
 * Retrieves the store's currency code.
 * @returns {string | undefined} The currency code (e.g., 'USD') or undefined.
 */
export function getCurrency() {
  return storeCache?.currency;
}

/**
 * Formats a stored integer amount into a human-readable currency string.
 * @param {number} integerAmount - The amount in the smallest currency unit.
 * @returns {string} A formatted currency string (e.g., "$12.50").
 */
export function formatMoney(integerAmount) {
  if (typeof integerAmount !== 'number' || isNaN(integerAmount)) {
    logger.warn(`Invalid input for currency formatting: ${integerAmount}.`);
    return '';
  }
  const currency = getCurrency() || 'USD';
  const metadata = currencyMetadata[currency] || currencyMetadata['USD'];

  const displayValue = integerAmount / 10 ** metadata.minorUnit;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(displayValue);
}
