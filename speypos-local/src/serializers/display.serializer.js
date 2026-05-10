import * as moneyService from '../services/money.service.js';
import * as settingsService from '../services/settings.service.js';

/**
 * Formats an order item for the display API response.
 * @param {object} item - The raw order item from the database.
 * @returns {object} The formatted item.
 */
function formatItem(item) {
  const subtotal = item.unit_price * item.quantity;
  const toppings = (item.toppings || []).map((topping) => {
    const unitLabel = topping.unit_label || 'qty';
    if (unitLabel === 'qty') {
      return `${topping.name} x${topping.quantity}`;
    }
    return `${topping.name} ${topping.quantity} ${unitLabel}`;
  });
  return {
    name: item.menu_item_name,
    qty: item.quantity,
    customizations: item.customizations.map(c => c.name),
    toppings,
    unit_price: item.unit_price,
    subtotal: subtotal,
  };
}

/**
 * Formats a full order for the display API response (ORDERING or PAYING states).
 * @param {object} order - The full order object from the repository.
 * @returns {object} The formatted order for the display.
 */
export function formatOrderForDisplay(order) {
  const currency = settingsService.getString('pos.currency') || 'USD';
  const formattedOrder = {
    id: order.id,
    items: order.items.map(formatItem),
    total: order.total_amount,
    currency: currency,
  };

  // If in PAYING state, a payment object might be present
  const pendingPayment = order.payments?.find(p => p.status === 'pending');
  if (pendingPayment) {
    formattedOrder.received_cash = pendingPayment.received_cash;
    formattedOrder.change = pendingPayment.change;
  }

  return formattedOrder;
}
