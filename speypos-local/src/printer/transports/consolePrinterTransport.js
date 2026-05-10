import { logger } from '../../utils/logger.js';

export async function sendToConsolePrinter(payload, context = {}) {
  const text = Buffer.isBuffer(payload) ? payload.toString('utf8') : String(payload);

  logger.info('Console printer transport output', {
    ...context,
    length: text.length,
  });

  console.log(text);
}
