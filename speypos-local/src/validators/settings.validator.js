import { SUPPORTED_INTENTS } from '../constants/telegram.constants.js';

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertAllowedKeys(target, allowedKeys, path, { requireAll = true } = {}) {
  const keys = Object.keys(target);
  for (const key of keys) {
    if (!allowedKeys.includes(key)) {
      throw new ValidationError(`Unknown key at ${path}: ${key}`);
    }
  }
  if (requireAll) {
    for (const key of allowedKeys) {
      if (!(key in target)) {
        throw new ValidationError(`Missing required key at ${path}: ${key}`);
      }
    }
  }
}

function assertString(value, path, { allowEmpty = true } = {}) {
  if (typeof value !== 'string') {
    throw new ValidationError(`${path} must be a string`);
  }
  if (!allowEmpty && value.trim().length === 0) {
    throw new ValidationError(`${path} must be a non-empty string`);
  }
}

function assertOptionalString(value, path, { allowEmpty = true } = {}) {
  if (value === undefined || value === null) return;
  assertString(value, path, { allowEmpty });
}

function assertBoolean(value, path) {
  if (typeof value !== 'boolean') {
    throw new ValidationError(`${path} must be a boolean`);
  }
}

function assertNumber(value, path) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new ValidationError(`${path} must be a number`);
  }
}

function assertInteger(value, path) {
  assertNumber(value, path);
  if (!Number.isInteger(value)) {
    throw new ValidationError(`${path} must be an integer`);
  }
}

function validateSystemInitialized(value) {
  assertBoolean(value, 'system.initialized');
}

function validateReceiptCopies(value) {
  if (!isPlainObject(value)) {
    throw new ValidationError('receipt.copies must be an object');
  }

  assertAllowedKeys(value, ['version', 'copies'], 'receipt.copies');

  if (value.version !== 1) {
    throw new ValidationError('receipt.copies.version must be 1');
  }

  if (!Array.isArray(value.copies)) {
    throw new ValidationError('receipt.copies.copies must be an array');
  }

  value.copies.forEach((copy, index) => {
    const itemPath = `receipt.copies.copies[${index}]`;
    if (!isPlainObject(copy)) {
      throw new ValidationError(`${itemPath} must be an object`);
    }
    assertAllowedKeys(copy, ['variant', 'count'], itemPath);
    assertString(copy.variant, `${itemPath}.variant`, { allowEmpty: false });
    assertInteger(copy.count, `${itemPath}.count`);
    if (copy.count < 1) {
      throw new ValidationError(`${itemPath}.count must be >= 1`);
    }
  });
}

function validateTelegramIntents(value) {
  if (!isPlainObject(value)) {
    throw new ValidationError('telegram.intents must be an object');
  }

  assertAllowedKeys(value, ['version', 'intents'], 'telegram.intents');

  if (value.version !== 1) {
    throw new ValidationError('telegram.intents.version must be 1');
  }

  if (!Array.isArray(value.intents)) {
    throw new ValidationError('telegram.intents.intents must be an array');
  }

  value.intents.forEach((intent, index) => {
    const itemPath = `telegram.intents.intents[${index}]`;
    if (!isPlainObject(intent)) {
      throw new ValidationError(`${itemPath} must be an object`);
    }
    assertAllowedKeys(intent, ['intent', 'enabled', 'chat_id'], itemPath);
    assertString(intent.intent, `${itemPath}.intent`, { allowEmpty: false });
    if (!SUPPORTED_INTENTS.includes(intent.intent)) {
      throw new ValidationError(
        `${itemPath}.intent must be one of: ${SUPPORTED_INTENTS.join(', ')}`
      );
    }
    assertBoolean(intent.enabled, `${itemPath}.enabled`);
    assertString(intent.chat_id, `${itemPath}.chat_id`);
  });
}

function validatePrinterLan(value) {
  if (!isPlainObject(value)) {
    throw new ValidationError('printer.lan must be an object');
  }

  assertAllowedKeys(
    value,
    ['version', 'enabled', 'connection_method', 'protocol', 'host', 'port', 'timeout_ms', 'profile'],
    'printer.lan',
    { requireAll: false }
  );

  for (const key of ['version', 'enabled', 'protocol', 'host', 'port', 'timeout_ms', 'profile']) {
    if (!(key in value)) {
      throw new ValidationError(`Missing required key at printer.lan: ${key}`);
    }
  }

  if (value.version !== 1) {
    throw new ValidationError('printer.lan.version must be 1');
  }

  assertBoolean(value.enabled, 'printer.lan.enabled');
  assertOptionalString(value.connection_method, 'printer.lan.connection_method', { allowEmpty: false });
  assertString(value.protocol, 'printer.lan.protocol', { allowEmpty: false });
    const connectionMethod = value.connection_method ?? 'lan';
    if (connectionMethod !== 'lan' && connectionMethod !== 'wifi') {
      throw new ValidationError('printer.lan.connection_method must be lan or wifi');
    }

  assertString(value.host, 'printer.lan.host');
  assertInteger(value.port, 'printer.lan.port');
  assertInteger(value.timeout_ms, 'printer.lan.timeout_ms');
  assertString(value.profile, 'printer.lan.profile', { allowEmpty: false });

  if (value.protocol !== 'raw9100') {
    throw new ValidationError('printer.lan.protocol must be raw9100');
  }

  if (value.port < 1 || value.port > 65535) {
    throw new ValidationError('printer.lan.port must be between 1 and 65535');
  }

  if (value.timeout_ms < 1000 || value.timeout_ms > 60000) {
    throw new ValidationError('printer.lan.timeout_ms must be between 1000 and 60000');
  }

  if (value.enabled && value.host.trim().length === 0) {
    throw new ValidationError('printer.lan.host must be provided when enabled');
  }
}

function validateCloudSync(value) {
  if (!isPlainObject(value)) {
    throw new ValidationError('cloud.sync must be an object');
  }

  const allowedKeys = [
    'version',
    'enabled',
    'api_key',
    'base_url',
    'store_id',
    'store_linked_at',
    'store_client_name',
    'store_last_seen_at',
  ];

  // Allow optional handshake-derived fields while still blocking unknown keys.
  assertAllowedKeys(value, allowedKeys, 'cloud.sync', { requireAll: false });

  for (const key of ['version', 'enabled', 'api_key', 'base_url']) {
    if (!(key in value)) {
      throw new ValidationError(`Missing required key at cloud.sync: ${key}`);
    }
  }

  if (value.version !== 1) {
    throw new ValidationError('cloud.sync.version must be 1');
  }

  assertBoolean(value.enabled, 'cloud.sync.enabled');
  assertString(value.api_key, 'cloud.sync.api_key');
  assertString(value.base_url, 'cloud.sync.base_url', { allowEmpty: false });

  assertOptionalString(value.store_id, 'cloud.sync.store_id');
  assertOptionalString(value.store_linked_at, 'cloud.sync.store_linked_at');
  assertOptionalString(value.store_client_name, 'cloud.sync.store_client_name');
  assertOptionalString(value.store_last_seen_at, 'cloud.sync.store_last_seen_at');

  if (value.enabled) {
    if (!value.api_key || value.api_key.trim().length === 0) {
      throw new ValidationError('cloud.sync.api_key must be provided when enabled');
    }
    if (!value.store_id || value.store_id.trim().length === 0) {
      throw new ValidationError('cloud.sync.store_id must be set when enabled');
    }
  }
}

const SETTING_SCHEMAS = {
  'system.initialized': {
    value_type: 'boolean',
    validate: validateSystemInitialized,
  },
  'receipt.copies': {
    value_type: 'json',
    validate: validateReceiptCopies,
  },
  'printer.lan': {
    value_type: 'json',
    validate: validatePrinterLan,
  },
  'telegram.intents': {
    value_type: 'json',
    validate: validateTelegramIntents,
  },
  'cloud.sync': {
    value_type: 'json',
    validate: validateCloudSync,
  },
};

export function validateSetting(key, value, valueType) {
  const schema = SETTING_SCHEMAS[key];
  if (!schema) {
    throw new ValidationError(`Unsupported setting key: ${key}`);
  }
  if (schema.value_type !== valueType) {
    throw new ValidationError(
      `Invalid value_type for ${key}. Expected ${schema.value_type}, received ${valueType}`
    );
  }
  schema.validate(value);
}
