import * as storeService from './store.service.js';
import en from '../localizations/en.json' with { type: 'json' };
import km from '../localizations/km.json' with { type: 'json' };
import { ORDER_STATUS } from '../constants/order.constants.js';

const translations = { en, km };

/**
 * Gets the localized strings based on the store's language setting.
 * Falls back to English if the language is not found.
 * @returns {object} The localization object.
 */
function getLocalization() {
  const lang = storeService.getLanguage() || 'en';
  return translations[lang] || translations.en;
}

/**
 * Simple string replacer for placeholders like {key}.
 * @param {string} template - The string with placeholders.
 * @param {object} values - A key-value map of placeholders to replace.
 * @returns {string} The formatted string.
 */
function t(template, values) {
  return Object.entries(values).reduce(
    (str, [key, value]) => str.replace(new RegExp(`{${key}}`, 'g'), value),
    template
  );
}

function formatToppingQuantity(topping) {
  if (topping.quantity === undefined || topping.quantity === null) {
    return '';
  }
  const unitLabel = topping.unit_label || 'qty';
  if (unitLabel === 'qty') {
    return `x${topping.quantity}`;
  }
  return `${topping.quantity} ${unitLabel}`;
}

/**
 * Formats the order data into a human-readable string for Telegram.
 * @param {object} order - The full order object with items and staff.
 * @param {object} [options={ isRetry: false }] - Formatting options.
 * @returns {string} The formatted message.
 */
export function formatOrderMessage(order, options = { isRetry: false }) {
  if (order.status === ORDER_STATUS.VOIDED) {
    return formatVoidOrderMessage(order, options);
  }

  const l = getLocalization();
  const { id, staff, items, total_amount, payments, created_at } = order;

  const payment_type = payments && payments.length > 0 ? payments[0].payment_type : 'N/A';
  const time = new Date(created_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const retryIndicator = options.isRetry ? l.retried_indicator || '' : '';
  let message = t(l.order_message.title, { orderId: id.slice(0, 8) }) + retryIndicator + '\n\n';
  message += t(l.order_message.time, { time }) + '\n';
  message += t(l.order_message.staff, { staffName: staff.name }) + '\n\n';
  message += l.order_message.items + '\n';

  // Group items by name
  const groupedItems = new Map();
  for (const item of items) {
    if (!groupedItems.has(item.menu_item_name)) {
      groupedItems.set(item.menu_item_name, []);
    }
    groupedItems.get(item.menu_item_name).push(item);
  }

  // Generate message from grouped items
  message += '\n';
  for (const [name, grouped] of groupedItems.entries()) {
    message += `*${name}*\n`; // Item name as a bold heading
    for (const item of grouped) {
      const customizationValues = (item.customizations || []).map((c) => c.value).filter(Boolean);

      const toppingValues = (item.toppings || [])
        .map((topping) => {
          const qtyText = formatToppingQuantity(topping);
          return qtyText ? `${topping.name} ${qtyText}` : topping.name;
        })
        .filter(Boolean);

      const details = [...customizationValues, ...toppingValues].join(', ');

      const quantityText = t(l.order_message.quantity_short, { quantity: item.quantity });

      if (details) {
        message += `- (${details}) ${quantityText}\n`;
      } else {
        // If there are no customizations, just show the quantity
        message += `- ${quantityText}\n`;
      }
    }
    message += '\n';
  }

  let paymentTypeLabel = payment_type;
  if (payment_type === 'cash') {
    paymentTypeLabel = l.order_message.cash_payment;
  } else if (payment_type === 'qr') {
    paymentTypeLabel = l.order_message.qr_payment;
  }

  message += `\n${t(l.order_message.total, { totalAmount: storeService.formatMoney(total_amount) })}\n`;
  message += t(l.order_message.payment, { paymentType: paymentTypeLabel }) + '\n';

  return message;
}

function formatVoidOrderMessage(order, options = { isRetry: false }) {
  const l = getLocalization();
  const { id, staff, void_reason, void_note, voided_at, voided_by_staff } = order;
  const time = new Date(voided_at || Date.now()).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const voidedByName = voided_by_staff?.name || staff?.name || '-';

  const retryIndicator = options.isRetry ? l.retried_indicator || '' : '';
  let message =
    t(l.void_message?.title || `❌ Order Voided: #${id.split('-')[0]}`, { orderId: id.split('-')[0] }) + retryIndicator + '\n\n';
  message += t(l.void_message?.time || 'Time: {time}', { time }) + '\n';
  message += t(l.void_message?.staff || 'Staff: {staffName}', { staffName: voidedByName }) + '\n';
  message +=
    t(l.void_message?.reason || 'Reason: {reason}', {
      reason: l.void_message?.reasons?.[void_reason] || void_reason || '-',
    }) + '\n';
  if (void_note) {
    message += t(l.void_message?.note || 'Note: {note}', { note: void_note }) + '\n';
  }

  return message;
}

/**
 * Formats the shift closing data into a summary report for Telegram.
 * @param {object} shiftReport - The aggregated shift report data.
 * @param {object} [options={ isRetry: false }] - Formatting options.
 * @returns {string} The formatted message.
 */
export function formatShiftCloseMessage(shiftReport, options = { isRetry: false }) {
  const l = getLocalization();
  const {
    shift,
    totalOrders,
    totalRevenue,
    totalItems,
    revenueByPaymentType,
    voidedOrders,
    voidedAmount,
    voidedItems,
  } = shiftReport;

  const startDate = new Date(shift.started_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  const endDate = new Date(shift.ended_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const retryIndicator = options.isRetry ? l.retried_indicator || '' : '';
  let message = t(l.shift_close_message.title, { date: shift.date }) + retryIndicator + '\n\n';
  message += t(l.shift_close_message.duration, { startTime: startDate, endTime: endDate }) + '\n\n';
  message += t(l.shift_close_message.total_orders, { totalOrders }) + '\n';
  message += t(l.shift_close_message.total_items_sold, { totalItems }) + '\n';
  if (voidedOrders && voidedOrders > 0) {
    message += '\n';
    message +=
      t(l.shift_close_message.voided_orders || 'Voided Orders: {count}', { count: voidedOrders }) +
      '\n';
    message +=
      t(l.shift_close_message.voided_items || 'Voided Items: {voidedItems}', {
        voidedItems: voidedItems ?? 0,
      }) + '\n';
    message +=
      t(l.shift_close_message.voided_amount || 'Voided Amount: {amount}', {
        amount: storeService.formatMoney(voidedAmount || 0),
      }) + '\n\n';
  }
  message += l.shift_close_message.revenue_by_payment_type + '\n';
  for (const [type, amount] of Object.entries(revenueByPaymentType)) {
    let typeLabel = type;
    if (type === 'cash') {
      typeLabel = l.shift_close_message.cash_payment;
    } else if (type === 'qr') {
      typeLabel = l.shift_close_message.qr_payment;
    }
    message +=
      t(l.shift_close_message.revenue_line, {
        type: typeLabel,
        amount: storeService.formatMoney(amount),
      }) + '\n';
  }

  message += `\n${t(l.shift_close_message.total_revenue, { totalRevenue: storeService.formatMoney(totalRevenue) })}\n`;

  return message;
}

/**
 * Formats the day close report into a summary for Telegram.
 * @param {object} dayReport - The aggregated day report data.
 * @returns {string} The formatted message.
 */
export function formatDayCloseMessage(dayReport) {
  const l = getLocalization();
  const { businessDate, shiftSummaries, combinedSummary } = dayReport;

  let message = `*${l.day_close_summary.title}*\n\n`;
  message += `_${t(l.day_close_summary.business_date, { date: businessDate })}_\n\n`;

  shiftSummaries.forEach((summary, index) => {
    message += `*${t(l.day_close_summary.shift_section_header, { shiftNumber: index + 1 })}*\n`;
    message += `${t(l.day_close_summary.total_orders, { count: summary.totalOrders })}\n`;
    message += `${t(l.day_close_summary.total_items_sold, { totalItemsSold: summary.totalItems })}\n`;
    message += `${t(l.day_close_summary.total_revenue, { amount: storeService.formatMoney(summary.totalRevenue) })}\n`;
    if (summary.voidedOrders && summary.voidedOrders > 0) {
      message += '\n';
      message += `${t(l.day_close_summary.voided_orders || 'Voided Orders: {count}', { count: summary.voidedOrders })}\n`;
      message += `${t(l.day_close_summary.voided_items || 'Voided Items: {count}', { count: summary.voidedItems || 0 })}\n`;
      message += `${t(l.day_close_summary.voided_amount || 'Voided Amount: {amount}', { amount: storeService.formatMoney(summary.voidedAmount || 0) })}\n\n`;
    }
    if (Object.keys(summary.revenueByPaymentType).length > 0) {
      message += `${l.day_close_summary.payment_breakdown}\n`;
      for (const [type, amount] of Object.entries(summary.revenueByPaymentType)) {
        message += `${t(l.day_close_summary.payment_line, { type, amount: storeService.formatMoney(amount) })}\n`;
      }
    }
    message += '\n\n';
  });

  message += `\n*${l.day_close_summary.combined_section_header}*\n`;
  message += `${t(l.day_close_summary.total_orders, { count: combinedSummary.totalOrders })}\n`;
  message += `${t(l.day_close_summary.grand_total_items_sold, { grandTotalItemsSold: combinedSummary.grandTotalItems })}\n`;
  message += `${t(l.day_close_summary.grand_total_revenue, { amount: storeService.formatMoney(combinedSummary.totalRevenue) })}\n`;
  if (combinedSummary.voidedOrders && combinedSummary.voidedOrders > 0) {
    message += '\n';
    message += `${t(l.day_close_summary.voided_orders || 'Voided Orders: {count}', { count: combinedSummary.voidedOrders })}\n`;
    message += `${t(l.day_close_summary.voided_items || 'Voided Items: {count}', { count: combinedSummary.voidedItems || 0 })}\n`;
    message += `${t(l.day_close_summary.voided_amount || 'Voided Amount: {amount}', { amount: storeService.formatMoney(combinedSummary.voidedAmount || 0) })}\n\n`;
  }
  if (Object.keys(combinedSummary.revenueByPaymentType).length > 0) {
    message += `${l.day_close_summary.payment_breakdown}\n`;
    for (const [type, amount] of Object.entries(combinedSummary.revenueByPaymentType)) {
      let typeLabel = type;
      if (type === 'cash') {
        typeLabel = l.day_close_summary.cash_payment;
      } else if (type === 'qr') {
        typeLabel = l.day_close_summary.qr_payment;
      }
      message += `${t(l.day_close_summary.payment_line, { type: typeLabel, amount: storeService.formatMoney(amount) })}\n`;
    }
  }
  message += '\n';
  message += `*${l.day_close_summary.conclusion}*`;

  return message;
}
