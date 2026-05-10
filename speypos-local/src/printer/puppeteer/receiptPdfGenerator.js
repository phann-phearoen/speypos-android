import fs from 'fs';
import en from '../../localizations/en.json' with { type: 'json' };
import km from '../../localizations/km.json' with { type: 'json' };
import * as storeService from '../../services/store.service.js';
import { getBrowser, closeBrowser } from './browserService.js';
import { paths } from '../../config/paths.js';
import { ORDER_STATUS } from '../../constants/order.constants.js';

const translations = { en, km };

function getLocalization() {
  const lang = storeService.getLanguage() || 'en';
  const loc = translations[lang] || translations.en;
  return loc.receipt;
}

export async function renderReceiptAsPdf(data, variant = 'INTERNAL') {
  const htmlContent = renderReceiptAsHtml(data, variant);

  let browser = null;
  let page = null;
  let tmpFile = null;

  try {
    browser = await getBrowser();
    page = await browser.newPage();

    await page.setViewport({ width: 302, height: 800 });
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    tmpFile = `${paths.receipts}/receipt_${data.id || 'temp'}.pdf`;

    await page.pdf({
      path: tmpFile,
      width: '80mm',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
  } catch (error) {
    console.error('Error generating PDF receipt:', error);
    await closeBrowser();

    throw error;
  } finally {
    if (page) {
      await page.close();
    }
  }

  return tmpFile;
}

export function renderReceiptAsHtml(order, variant) {
  console.log('rendering receipt for order:', order);
  let template = fs.readFileSync(paths.receiptTemplate, 'utf-8');
  const l = getLocalization();
  const {
    id,
    items,
    total_amount,
    payments,
    created_at,
    void_reason,
    void_note,
    voided_at,
    staff,
    voided_by_staff,
    status,
  } = order;
  const payment = payments && payments.length > 0 ? payments[0] : {};
  const useID = id.split('-')[0] || id;
  const timestamp = new Date(created_at).toLocaleString(storeService.getLanguage() || 'en');

  if (variant === 'VOID' || status === ORDER_STATUS.VOIDED) {
    const voidTemplate = fs.readFileSync(paths.voidReceiptTemplate, 'utf-8');
    const voidTimestamp = new Date(voided_at || Date.now()).toLocaleString(
      storeService.getLanguage() || 'en'
    );
    const reasonLabel = l.void_reasons?.[void_reason] || void_reason || 'N/A';
    const voidedByName = voided_by_staff?.name || staff?.name || 'Unknown';
    const staffName = staff?.name || 'Unknown';
    const titleText = `${l.title} (${l.status_voided || 'Voided'})`;
    const orderIdLabel = (l.order_id?.split('{')?.[0] || 'Order ID').replace(/[\s:៖：]+$/, '');
    const dateLabel = l.original_created_label || 'Created at';
    const itemsHtml = formItemsTrs(items);
    return applyTemplate(voidTemplate, {
      '{{title}}': titleText,
      '{{orderIdLabel}}': orderIdLabel,
      '{{orderIdValue}}': useID,
      '{{dateLabel}}': dateLabel,
      '{{dateValue}}': timestamp,
      '{{itemsHeader}}': l.items_header,
      '{{customizationsHeader}}': l.customization_header,
      '{{quantityHeader}}': l.quantity_header,
      '{{items}}': itemsHtml,
      '{{statusLabel}}': l.status_label || 'Status',
      '{{statusValue}}': l.status_voided || 'Voided',
      '{{reasonLabel}}': l.void_reason_label || 'Reason',
      '{{reasonValue}}': reasonLabel,
      '{{noteLabel}}': l.void_note_label || 'Note',
      '{{noteValue}}': void_note || '-',
      '{{voidedByLabel}}': l.voided_by_label || 'Voided by',
      '{{voidedByValue}}': voidedByName,
      '{{voidedAtLabel}}': l.voided_at_label || 'Voided at',
      '{{voidedAtValue}}': voidTimestamp,
    });
  }

  if (variant === 'INTERNAL') {
    template = template.replace('{{title}}', l.title);
    template = template.replace('{{orderId}}', useID);
    template = template.replace('{{date}}', timestamp);

    template = template.replace('{{itemsHeader}}', l.items_header);
    template = template.replace('{{customizationsHeader}}', l.customization_header);
    template = template.replace('{{quantityHeader}}', l.quantity_header);

    const itemsHtml = formItemsTrs(items);
    template = template.replace('{{items}}', itemsHtml);
  }

  return template;
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

function formItemsTrs(items) {
  const groupedItems = new Map();

  for (const item of items) {
    if (!groupedItems.has(item.menu_item_name)) {
      groupedItems.set(item.menu_item_name, []);
    }
    groupedItems.get(item.menu_item_name).push(item);
  }

  let itemsHtml = '';
  for (const [itemName, itemGroup] of groupedItems.entries()) {
    itemGroup.forEach((item, idx) => {
      itemsHtml += '<tr>';
      if (idx === 0) {
        // Only the first row gets the item cell with rowspan
        itemsHtml += `<td class="item" rowspan="${itemGroup.length}">${itemName}</td>`;
      }
      const customizationValues = (item.customizations || []).map((c) => c.value).filter(Boolean);

      const toppingValues = (item.toppings || [])
        .map((topping) => {
          const qtyText = formatToppingQuantity(topping);
          return qtyText ? `${topping.name} ${qtyText}` : topping.name;
        })
        .filter(Boolean);

      const details = [...customizationValues, ...toppingValues].join(', ');

      itemsHtml += `<td class="customizations">${details}</td>`;
      itemsHtml += `<td class="qty">${item.quantity}</td>`;
      itemsHtml += '</tr>';
    });
  }

  return itemsHtml;
}

function applyTemplate(template, replacements) {
  let output = template;
  for (const [token, value] of Object.entries(replacements)) {
    output = output.replace(new RegExp(token, 'g'), value);
  }
  return output;
}
