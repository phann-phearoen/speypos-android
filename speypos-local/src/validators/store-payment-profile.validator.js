export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertAllowedKeys(target, allowedKeys, path) {
  const keys = Object.keys(target);
  for (const key of keys) {
    if (!allowedKeys.includes(key)) {
      throw new ValidationError(`Unknown key at ${path}: ${key}`);
    }
  }
  for (const key of allowedKeys) {
    if (!(key in target)) {
      throw new ValidationError(`Missing required key at ${path}: ${key}`);
    }
  }
}

export function validatePaymentProfile(paymentProfile) {
  if (!isPlainObject(paymentProfile)) {
    throw new ValidationError('payment_profile must be an object');
  }

  assertAllowedKeys(paymentProfile, ['version', 'qr'], 'payment_profile');

  if (paymentProfile.version !== 1) {
    throw new ValidationError('payment_profile.version must be 1');
  }

  if (!isPlainObject(paymentProfile.qr)) {
    throw new ValidationError('payment_profile.qr must be an object');
  }

  assertAllowedKeys(paymentProfile.qr, ['enabled', 'image_url'], 'payment_profile.qr');

  const { enabled, image_url } = paymentProfile.qr;

  if (typeof enabled !== 'boolean') {
    throw new ValidationError('payment_profile.qr.enabled must be a boolean');
  }

  const imageUrlType = image_url === null ? 'null' : typeof image_url;
  if (imageUrlType !== 'string' && image_url !== null) {
    throw new ValidationError('payment_profile.qr.image_url must be a string or null');
  }

  if (image_url === null && enabled !== false) {
    throw new ValidationError('payment_profile.qr.enabled must be false when image_url is null');
  }

  if (typeof image_url === 'string') {
    const trimmed = image_url.trim();
    if (trimmed.length === 0) {
      throw new ValidationError(
        'payment_profile.qr.image_url must be a non-empty string when provided'
      );
    }
    if (enabled !== true) {
      throw new ValidationError(
        'payment_profile.qr.enabled must be true when image_url is provided'
      );
    }
  }
}
