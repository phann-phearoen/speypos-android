import { env } from '../config/env.js';
import * as settingsRepo from '../storage/repositories/settings.repo.js';
import { logger } from '../utils/logger.js';
import { ValidationError, validateSetting } from '../validators/settings.validator.js';

// In-memory cache for settings
const cache = new Map();

// Default settings provide a fallback and define the expected structure
const defaults = {
  'system.initialized': {
    value: 'false',
    value_type: 'boolean',
    category: 'System',
    description: 'Indicates if the initial setup has been completed.',
  },
  'receipt.copies': {
    value: JSON.stringify({
      version: 1,
      copies: [{ variant: 'INTERNAL', count: 1 }],
    }),
    value_type: 'json',
    category: 'Printing',
    description: 'Configuration for how many copies of a receipt to print for different purposes.',
  },
  'printer.lan': {
    value: JSON.stringify({
      version: 1,
      enabled: false,
      protocol: 'raw9100',
      host: '',
      port: 9100,
      timeout_ms: 5000,
      profile: 'default',
    }),
    value_type: 'json',
    category: 'Printing',
    description: 'LAN printer configuration for RAW TCP printing transport.',
  },
  'telegram.intents': {
    value: JSON.stringify({
      version: 1,
      intents: [
        { intent: 'ORDER_TRACKER', enabled: false, chat_id: '' },
        { intent: 'SHIFT_TRACKER', enabled: false, chat_id: '' },
      ],
    }),
    value_type: 'json',
    category: 'Integrations',
    description: 'Configuration for Telegram reporting intents.',
  },
  'cloud.sync': {
    value: JSON.stringify({
      version: 1,
      enabled: false,
      api_key: '',
      base_url: env.cloudBaseUrl,
      store_id: null,
      store_linked_at: null,
      store_client_name: null,
      store_last_seen_at: null,
    }),
    value_type: 'json',
    category: 'Cloud Sync',
    description: 'Cloud ingestion configuration (toggle, key, base URL).',
  },
};

/**
 * Casts a raw string value to its proper type.
 * @param {string} value - The raw string value from the database.
 * @param {string} type - The target value_type.
 * @returns {any} The casted value.
 */
function castValue(value, type) {
  switch (type) {
    case 'string':
      return value;
    case 'number':
      return parseFloat(value);
    case 'boolean':
      return value === 'true' || value === '1';
    case 'json':
      try {
        return JSON.parse(value);
      } catch (error) {
        throw new ValidationError(`Invalid JSON for setting value: ${value}`);
      }
    default:
      return value;
  }
}

/**
 * Initializes the settings service by loading defaults and then overriding with DB values.
 */
export function initializeSettings() {
  logger.info('Initializing settings service...');

  // 1. Ensure all default settings exist in the database.
  logger.info('Verifying and seeding settings records...');
  const existingSettings = settingsRepo.getAllSettings();
  const dbKeys = new Set(existingSettings.map((s) => s.key));

  for (const [key, defaultSetting] of Object.entries(defaults)) {
    if (!dbKeys.has(key)) {
      const settingToCreate = {
        key: key,
        value: defaultSetting.value,
        value_type: defaultSetting.value_type,
        category: defaultSetting.category,
        description: defaultSetting.description,
      };
      settingsRepo.upsertSetting(settingToCreate);
      logger.info(`Created default setting '${key}' in database.`);
    }
  }

  // 2. Load ALL settings from the database into the cache.
  // This re-fetches everything after the seeding is complete to ensure cache consistency.
  const finalDbSettings = settingsRepo.getAllSettings();
  cache.clear();
  for (const setting of finalDbSettings) {
    const castedValue = castValue(setting.value, setting.value_type);
    validateSetting(setting.key, castedValue, setting.value_type);
    cache.set(setting.key, castedValue);
  }
  logger.info(`Settings loaded. ${cache.size} keys in cache.`);
}

/**
 * Retrieves a setting value, cast to its correct type.
 * @param {string} key - The key of the setting.
 * @returns {any | undefined} The casted value or undefined if not found.
 */
export function get(key) {
  return cache.get(key);
}

/**
 * Retrieves a setting value as a string.
 * @param {string} key - The key of the setting.
 * @returns {string | undefined}
 */
export function getString(key) {
  const value = get(key);
  return value === undefined ? undefined : String(value);
}

/**
 * Retrieves a setting value as a number.
 * @param {string} key - The key of the setting.
 * @returns {number | undefined}
 */
export function getNumber(key) {
  const value = get(key);
  const num = parseFloat(value);
  return isNaN(num) ? undefined : num;
}

/**
 * Retrieves a setting value as a boolean.
 * @param {string} key - The key of the setting.
 * @returns {boolean | undefined}
 */
export function getBoolean(key) {
  const value = get(key);
  if (value === undefined) return undefined;
  return value === true || value === 'true' || value === 1 || value === '1';
}

/**
 * Retrieves a setting value as a JSON object.
 * @param {string} key - The key of the setting.
 * @returns {object | undefined}
 */
export function getJSON(key) {
  const value = get(key);
  return typeof value === 'object' ? value : undefined;
}

/**
 * Updates a setting in the database and refreshes the cache.
 * @param {object} settingData - The full setting object.
 * @returns {object} The updated, casted setting object.
 */
export function set(settingData) {
  validateSetting(settingData.key, settingData.value, settingData.value_type);
  // Ensure value is stored as a string in the database
  const dbValue =
    typeof settingData.value === 'object'
      ? JSON.stringify(settingData.value)
      : String(settingData.value);

  const updatedRepoData = { ...settingData, value: dbValue };

  const updatedSetting = settingsRepo.upsertSetting(updatedRepoData);

  // Update cache with the correctly typed value
  const castedValue = castValue(updatedSetting.value, updatedSetting.value_type);
  validateSetting(updatedSetting.key, castedValue, updatedSetting.value_type);
  cache.set(updatedSetting.key, castedValue);

  return {
    key: updatedSetting.key,
    value: castedValue,
  };
}
