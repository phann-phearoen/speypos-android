import { exec } from 'child_process';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import { paths } from '../config/paths.js';

/**
 * Sends plain text to a named Windows printer using PowerShell.
 * @param {string} text - The receipt text to print.
 * @param {string} printerName - The Windows printer name.
 * @returns {Promise<void>} Resolves on success, rejects on error.
 */
export async function printTextToWindowsPrinter(receiptPdf, printerName) {
  const sumatraPath = paths.sumatraPdf;

  // Use SumatraPDF's CLI directly with -silent for non-blocking print
  const command = `powershell -NoProfile -Command "& '${sumatraPath}' -print-to '${printerName}' -silent '${receiptPdf}'"`;

  logger.info('Preparing Windows print job', {
    sumatraPath,
    printerName,
    receiptPdf,
  });
  logger.debug?.('Windows print command', { command });

  return new Promise((resolve, reject) => {
    exec(command, { timeout: 0 }, (error, stdout, stderr) => {
      if (stdout && stdout.trim().length > 0) {
        logger.info('Windows print stdout', { stdout });
      }
      if (stderr && stderr.trim().length > 0) {
        logger.warn('Windows print stderr', { stderr });
      }

      try {
        fs.unlinkSync(receiptPdf);
      } catch (unlinkError) {
        logger.warn('Failed to remove receipt PDF after print attempt', {
          receiptPdf,
          error: unlinkError?.message,
        });
      }

      if (error) {
        logger.error(`Windows print failed: ${stderr || error.message}`);
        reject(error);
      } else {
        logger.info(`Print job submitted to Windows printer: ${printerName}`);
        resolve();
      }
    });
  });
}
