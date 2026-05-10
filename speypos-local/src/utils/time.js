/**
 * Returns the current time as an ISO 8601 string.
 * @returns {string}
 */
export function now() {
  return new Date().toISOString();
}

/**
 * Formats a date object or string for display.
 * @param {Date | string} date
 * @returns {string}
 */
export function formatDisplayTime(date) {
  return new Date(date).toLocaleString();
}
