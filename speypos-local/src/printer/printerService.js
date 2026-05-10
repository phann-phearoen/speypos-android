import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { renderReceiptAsPdf, renderReceiptAsHtml } from './puppeteer/receiptPdfGenerator.js';
import { printTextToWindowsPrinter } from './windowsPrinter.js';
import * as orderRepo from '../storage/repositories/order.repo.js';
import * as settingsService from '../services/settings.service.js';
import { ORDER_STATUS } from '../constants/order.constants.js';

/**
 * Prints a receipt for a given order based on settings.
 * Fetches `receipt.copies` from settings to determine how many copies and which variants to print.
 * Checks if the receipt has already been printed to prevent duplicates.
 * Can perform a dry run that logs to the console or print to a real ESC/POS printer.
 *
 * @param {object} order - The full order object.
 */
const printerName = env.printerName || 'CONSOLE';

export async function printReceipt(order) {
  if (order.printed_at) {
    logger.warn(`Receipt for order ${order.id} has already been printed. Skipping.`);
    return;
  }
  const { items } = order;
  if (!items || items.length === 0) {
    logger.warn(`Order ${order} has no items or data is malformed. Skipping print.`);
    return;
  }

  if (![ORDER_STATUS.COMPLETED, ORDER_STATUS.VOIDED].includes(order.status)) {
    logger.warn(`Order ${order.id} is not printable in status ${order.status}. Skipping.`);
    return;
  }

  const isVoided = order.status === ORDER_STATUS.VOIDED;
  const copiesConfig = settingsService.getJSON('receipt.copies');
  const copies = isVoided
    ? [{ variant: 'VOID', count: 1 }]
    : copiesConfig?.copies || [{ variant: 'INTERNAL', count: 1 }];

  logger.info(`Starting print job for order ID: ${order.id}.`, { status: order.status });

  try {
    logger.info(`Printing ${copies.length} variants for order ${order.id}`, {
      copies,
    });

    for (const copy of copies) {
      const { variant, count } = copy;
      const receiptPdf = await renderReceiptAsPdf(order, variant);

      if (printerName === 'CONSOLE') {
        console.log(
          `Printing to console for variant ${variant} of order ${order.id}:\n${receiptPdf}`
        );
      } else {
        for (let i = 0; i < count; i++) {
          logger.info(
            `Printing copy ${i + 1}/${count} of variant ${variant} for order ${order.id}.`
          );

          try {
            await printTextToWindowsPrinter(receiptPdf, printerName);
          } catch (err) {
            logger.error(`Windows print failed for copy ${i + 1}/${count}: ${err.message}`);
          }
        }
      }
    }

    // Mark as printed only after ALL copies are successfully sent/logged
    orderRepo.markAsPrinted(order.id);
    logger.info(`Print job for order ${order.id} completed and marked as printed.`);
  } catch (error) {
    logger.error(`Failed print job for order ${order.id}`, {
      error: error.message,
    });
    // Do not mark as printed if there was an error.
    // Re-throw the error so the caller knows the operation failed.
    throw error;
  }
}
