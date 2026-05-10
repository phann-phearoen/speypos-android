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
  const required = ['PORT', 'DB_PATH', 'PRINTER_NAME', 'TELEGRAM_BOT_TOKEN'];
  const missing = required.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
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

export const env = {
  port: process.env.PORT,
  dbPath: process.env.DB_PATH,
  printerName: process.env.PRINTER_NAME,
  syncMiniBatchSize,
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',
};
