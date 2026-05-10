import * as storeService from './store.service.js';

/**
 * Formats a stored integer amount into a human-readable currency string.
 * @deprecated This function is deprecated. Use storeService.formatMoney() instead.
 * @param {number} integerAmount - The amount in the smallest currency unit.
 * @returns {string} A formatted currency string (e.g., "$12.50").
 */
export function format(integerAmount) {
  return storeService.formatMoney(integerAmount);
}

