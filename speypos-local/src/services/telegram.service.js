import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { formatOrderMessage, formatShiftCloseMessage } from './telegram.formatter.js';
import * as orderRepo from '../storage/repositories/order.repo.js';
import * as shiftRepo from '../storage/repositories/shift.repo.js';
import * as settingsService from './settings.service.js';
import { SUPPORTED_INTENTS } from '../constants/telegram.constants.js';
export { SUPPORTED_INTENTS } from '../constants/telegram.constants.js';

/**
 * Core private function to send a message via the Telegram API.
 * @param {string} botToken - The Telegram bot token.
 * @param {string} chatId - The target chat ID.
 * @param {string} text - The message text to send.
 * @returns {Promise<void>}
 */
async function _send(botToken, chatId, text) {
  const baseUrl = `https://api.telegram.org/bot${botToken}`;
  const url = `${baseUrl}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    logger.error('Telegram API error', {
      status: response.status,
      description: errorBody.description,
    });
    throw new Error(
      `Telegram API error: ${response.status} ${response.statusText} - ${errorBody.description}`
    );
  }

  logger.info('Telegram message sent successfully.');
}

/**
 * Sends a message for a specific intent, checking configuration first.
 * This is the new central entry point for all Telegram notifications.
 * @param {string} intent - The intent of the message (e.g., 'ORDER_TRACKER').
 * @param {string} message - The formatted message text.
 */
export async function sendTelegramEvent(intent, message) {
  const botToken = env.telegramBotToken;

  if (!botToken) {
    logger.warn(
      'TELEGRAM_BOT_TOKEN environment variable is not set. Cannot send Telegram message.'
    );
    return; // Fail silently as required.
  }

  const intentsConfig = settingsService.get('telegram.intents');
  const intentsConfigArr = intentsConfig?.intents;
  if (!Array.isArray(intentsConfigArr)) {
    logger.error('Telegram intents configuration is not an array. Cannot send message.');
    return;
  }
  const intentConfig = intentsConfigArr.find((cfg) => cfg.intent === intent);

  if (!intentConfig) {
    logger.warn(`Telegram intent '${intent}' is not configured. Skipping.`);
    return;
  }

  if (!intentConfig.enabled || !intentConfig.chat_id) {
    logger.info(`Telegram intent '${intent}' is disabled or missing chat_id. Skipping.`);
    return;
  }

  await _send(botToken, intentConfig.chat_id, message);
}

/**
 * Formats and sends a notification for a newly created order.
 * Checks if the order has already been reported to prevent duplicates.
 * @param {object} order - The full order object.
 * @param {object} [options={ isRetry: false }] - Sending options.
 */
export async function sendOrderNotification(order, options = { isRetry: false }) {
  if (order.telegram_reported_at) {
    logger.warn(`Order ${order.id} has already been reported to Telegram. Skipping.`);
    return;
  }

  try {
    const message = formatOrderMessage(order, options);
    await sendTelegramEvent('ORDER_TRACKER', message);
    await orderRepo.markAsTelegramReported(order.id);
    logger.info(`Successfully sent and marked Telegram notification for order ${order.id}`);
  } catch (error) {
    logger.error('Failed to send or mark Telegram notification for order', {
      orderId: order.id,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Formats and sends a summary report for a closed shift.
 * Checks if the shift has already been reported to prevent duplicates.
 * @param {object} shiftReport - The aggregated shift report data.
 * @param {object} [options={ isRetry: false }] - Sending options.
 */
export async function sendShiftCloseNotification(shiftReport, options = { isRetry: false }) {
  const shiftId = shiftReport?.shift?.id;
  if (!shiftId) {
    logger.error('Cannot send shift close notification: shift ID is missing from report.');
    return;
  }

  if (shiftReport.shift.telegram_reported_at) {
    logger.warn(`Shift ${shiftId} has already been reported to Telegram. Skipping.`);
    return;
  }

  try {
    const message = formatShiftCloseMessage(shiftReport, options);
    await sendTelegramEvent('SHIFT_TRACKER', message);
    await shiftRepo.markAsTelegramReported(shiftId);
    logger.info(`Successfully sent and marked Telegram notification for shift ${shiftId}`);
  } catch (error) {
    logger.error('Failed to send or mark Telegram notification for shift', {
      shiftId,
      error: error.message,
    });
    throw error;
  }
}
