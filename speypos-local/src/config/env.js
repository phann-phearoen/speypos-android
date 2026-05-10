import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Validates and exports environment variables.
 * Fails fast if required variables are missing.
 */
function validateEnv() {
  const required = ['PORT', 'DB_PATH'];

  const missing = required.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

function parseBooleanEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

const VALID_RUNTIME_PROFILES = ['default', 'android-termux', 'development'];

function shouldForceConsolePrinter() {
  const runtimeProfile = process.env.RUNTIME_PROFILE || 'default';
  const fallback = runtimeProfile === 'android-termux';
  return parseBooleanEnv('FORCE_CONSOLE_PRINTER', fallback);
}

function parseIntegerEnv(name, fallback, { min, max }) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${name} must be an integer, received: ${raw}`);
  }

  if (parsed < min || parsed > max) {
    throw new Error(`${name} must be between ${min} and ${max}, received: ${parsed}`);
  }

  return parsed;
}

validateEnv();

const syncMiniBatchSize = parseIntegerEnv('SYNC_MINI_BATCH_SIZE', 20, { min: 1, max: 200 });
const runtimeProfile = process.env.RUNTIME_PROFILE || 'default';

if (!VALID_RUNTIME_PROFILES.includes(runtimeProfile)) {
  throw new Error(
    `Invalid RUNTIME_PROFILE "${runtimeProfile}". Must be one of: ${VALID_RUNTIME_PROFILES.join(', ')}`
  );
}

const forceConsolePrinter = shouldForceConsolePrinter();

export const env = {
  port: process.env.PORT,
  dbPath: process.env.DB_PATH,
  runtimeProfile,
  forceConsolePrinter,
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || null,
  syncMiniBatchSize,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:8000',
  cloudBaseUrl: (process.env.CLOUD_BASE_URL || 'https://speypos-cloud.ryong.net').replace(/\/+$/, ''),
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',
};
