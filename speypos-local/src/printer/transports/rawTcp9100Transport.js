import net from 'net';
import { logger } from '../../utils/logger.js';

export async function sendToRawTcp9100Printer(payload, config, context = {}) {
  if (!config?.host) {
    throw new Error('RAW TCP printer host is required.');
  }

  const port = Number.isInteger(config.port) ? config.port : 9100;
  const timeoutMs = Number.isInteger(config.timeoutMs) ? config.timeoutMs : 5000;

  await new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;

    function finishWithError(error) {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(error);
    }

    function finishSuccess() {
      if (settled) return;
      settled = true;
      resolve();
    }

    socket.setTimeout(timeoutMs);

    socket.on('timeout', () => {
      finishWithError(new Error(`Printer connection timed out after ${timeoutMs}ms.`));
    });

    socket.on('error', (error) => {
      finishWithError(error);
    });

    socket.on('close', () => {
      finishSuccess();
    });

    socket.connect(port, config.host, () => {
      socket.write(payload, (error) => {
        if (error) {
          finishWithError(error);
          return;
        }
        socket.end();
      });
    });
  });

  logger.info('RAW TCP print payload sent', {
    host: config.host,
    port,
    timeoutMs,
    profile: config.profile || 'default',
    bytes: Buffer.isBuffer(payload) ? payload.length : Buffer.byteLength(String(payload)),
    ...context,
  });
}
