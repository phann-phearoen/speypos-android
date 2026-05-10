import en from '../../localizations/en.json' with { type: 'json' };
import km from '../../localizations/km.json' with { type: 'json' };
import { ORDER_STATUS } from '../../constants/order.constants.js';

const translations = { en, km };

function getLocalization(language) {
  const lang = language || 'en';
  const loc = translations[lang] || translations.en;
  return loc.receipt;
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

function formatOrderItems(items) {
  const lines = [];

  for (const item of items || []) {
    lines.push(`${item.quantity} x ${item.menu_item_name}`);

    const customizations = (item.customizations || []).map((c) => c.value).filter(Boolean);
    const toppings = (item.toppings || [])
      .map((topping) => {
        const qtyText = formatToppingQuantity(topping);
        return qtyText ? `${topping.name} ${qtyText}` : topping.name;
      })
      .filter(Boolean);

    const details = [...customizations, ...toppings].join(', ');
    if (details) {
      lines.push(`  - ${details}`);
    }
  }

  return lines;
}

function buildReceiptText(order, variant, language) {
  const l = getLocalization(language);
  const shortOrderId = order.id?.split('-')[0] || order.id || 'N/A';
  const timestamp = new Date(order.created_at || Date.now()).toLocaleString(language || 'en');
  const lines = [];

  const isVoided = variant === 'VOID' || order.status === ORDER_STATUS.VOIDED;

  if (isVoided) {
    const reasonLabel = l.void_reasons?.[order.void_reason] || order.void_reason || 'N/A';
    const voidedAt = new Date(order.voided_at || Date.now()).toLocaleString(language || 'en');
    const voidedBy = order.voided_by_staff?.name || order.staff?.name || 'Unknown';

    lines.push(`${l.title} (${l.status_voided || 'Voided'})`);
    lines.push('--------------------------------');
    lines.push(`Order ID: ${shortOrderId}`);
    lines.push(`${l.original_created_label || 'Created at'}: ${timestamp}`);
    lines.push('--------------------------------');
    lines.push(...formatOrderItems(order.items));
    lines.push('--------------------------------');
    lines.push(`${l.void_reason_label || 'Reason'}: ${reasonLabel}`);
    lines.push(`${l.void_note_label || 'Note'}: ${order.void_note || '-'}`);
    lines.push(`${l.voided_by_label || 'Voided by'}: ${voidedBy}`);
    lines.push(`${l.voided_at_label || 'Voided at'}: ${voidedAt}`);
    return `${lines.join('\n')}\n\n`;
  }

  lines.push(l.title || 'Receipt');
  lines.push('--------------------------------');
  lines.push(`Order ID: ${shortOrderId}`);
  lines.push(`Date: ${timestamp}`);
  lines.push('--------------------------------');
  lines.push(...formatOrderItems(order.items));
  lines.push('--------------------------------');

  return `${lines.join('\n')}\n\n`;
}

export function renderReceiptAsEscPos(order, variant = 'INTERNAL') {
  const language = order.language || 'en';
  const initCommand = Buffer.from([0x1b, 0x40]);
  const cutCommand = Buffer.from([0x1d, 0x56, 0x00]);
  const textPayload = Buffer.from(buildReceiptText(order, variant, language), 'utf8');

  return Buffer.concat([initCommand, textPayload, cutCommand]);
}
