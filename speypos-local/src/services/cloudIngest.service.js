import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import * as settingsService from './settings.service.js';
import * as storeService from './store.service.js';

const currencyMetadata = {
  USD: { minorUnit: 2 },
  KHR: { minorUnit: 0 },
};

function toIso(timestamp) {
  if (!timestamp) {
    return new Date().toISOString();
  }
  try {
    return new Date(timestamp).toISOString();
  } catch (error) {
    return new Date().toISOString();
  }
}

function toMajor(integerAmount, currencyCode) {
  if (integerAmount === undefined || integerAmount === null) {
    return null;
  }
  const currency = currencyCode || storeService.getCurrency() || 'USD';
  const meta = currencyMetadata[currency] || currencyMetadata.USD;
  const factor = 10 ** meta.minorUnit;
  const value = integerAmount / factor;
  return Number(value.toFixed(meta.minorUnit));
}

function buildOrderEvent(order, currencyCode) {
  const currency = currencyCode || storeService.getCurrency() || 'USD';
  const items = (order.items || []).map((item) => ({
    id: item.id,
    menu_item_id: item.menu_item_id,
    name: item.menu_item_name || item.name || null,
    quantity: item.quantity,
    unit_price: toMajor(item.unit_price, currency),
    total_price: toMajor(item.unit_price * item.quantity, currency),
    customizations: (item.customizations || []).map((c) => ({
      id: c.id,
      name: c.name,
      option_type: c.option_type,
      value: c.value,
      price: toMajor(c.price, currency),
    })),
    toppings: (item.toppings || []).map((t) => ({
      id: t.id,
      topping_option_id: t.topping_option_id,
      name: t.name,
      unit_label: t.unit_label,
      unit_price: toMajor(t.unit_price, currency),
      quantity: t.quantity,
      total_price: toMajor(t.total_price, currency),
    })),
  }));

  const payments = (order.payments || []).map((payment) => ({
    id: payment.id,
    status: payment.status,
    payment_type: payment.payment_type,
    amount: toMajor(payment.amount, currency),
    received_cash:
      payment.received_cash !== null && payment.received_cash !== undefined
        ? toMajor(payment.received_cash, currency)
        : null,
    change:
      payment.change !== null && payment.change !== undefined
        ? toMajor(payment.change, currency)
        : null,
    created_at: toIso(payment.created_at),
  }));

  return {
    event_type: 'ORDER_CREATED',
    occurred_at: toIso(order.created_at),
    payload: {
      id: order.id,
      shift_id: order.shift_id,
      staff_id: order.staff_id,
      status: order.status,
      total: toMajor(order.total_amount, currency),
      total_items: order.total_items,
      currency,
      items,
      payments,
      void_reason: order.void_reason || null,
      void_note: order.void_note || null,
      voided_at: order.voided_at ? toIso(order.voided_at) : null,
      voided_by: order.voided_by || null,
    },
  };
}

async function postJson(url, body, apiKey) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify(body),
  });

  let json;
  try {
    json = await response.json();
  } catch (error) {
    json = {};
  }

  const requestId = json?.meta?.request_id;

  if (!response.ok) {
    const message = json?.errors?.[0]?.message || response.statusText;
    const code = json?.errors?.[0]?.code;
    throw Object.assign(new Error(message), { code, requestId, status: response.status });
  }

  return { json, requestId };
}

function getConfig() {
  const cloudSync = settingsService.getJSON('cloud.sync') || {};
  const enabled = !!cloudSync.enabled;
  const apiKey = cloudSync.api_key || '';
  const baseUrl = (cloudSync.base_url || env.cloudBaseUrl).replace(/\/+$/, '');
  const storeId = cloudSync.store_id || null;
  const store = storeService.getStore();

  return { enabled, apiKey, baseUrl, storeId, store };
}

export async function uploadOrdersBatch({ shift, orders, source = 'shift_close' }) {
  const { enabled, apiKey, baseUrl, storeId, store } = getConfig();

  if (!enabled) {
    logger.info('Cloud sync disabled; skipping upload.');
    return { success: false, retryable: true, reason: 'disabled' };
  }

  if (!apiKey || !baseUrl) {
    logger.warn('Cloud sync missing configuration. Cannot upload orders.');
    return { success: false, retryable: true, reason: 'missing_config' };
  }

  if (!storeId) {
    logger.error('Cloud sync cannot proceed: cloud store_id missing.');
    return { success: false, retryable: true, reason: 'missing_cloud_store' };
  }

  if (!orders || orders.length === 0) {
    logger.info(`No orders to sync for shift ${shift?.id || 'unknown'}.`);
    return { success: true, skipped: true };
  }

  const businessDate = shift?.date;
  logger.info('Cloud sync starting.', {
    shiftId: shift?.id,
    businessDate,
    orderCount: orders.length,
    baseUrl,
    storeId,
  });

  try {
    const batchUrl = `${baseUrl}/stores/${storeId}/event_batches`;
    const { json: batchJson, requestId: batchRequestId } = await postJson(
      batchUrl,
      {
        event_batch: {
          business_date: businessDate,
          source,
        },
      },
      apiKey
    );

    const batchId = batchJson?.data?.event_batch?.id || batchJson?.data?.id;
    if (!batchId) {
      throw new Error('Cloud sync: missing batch id in response');
    }

    let lastRequestId = batchRequestId;
    for (const order of orders) {
      const event = buildOrderEvent(order, store?.currency);
      const eventUrl = `${baseUrl}/stores/${storeId}/event_batches/${batchId}/events`;
      const { requestId } = await postJson(eventUrl, { event }, apiKey);
      lastRequestId = requestId || lastRequestId;
    }

    logger.info(`Cloud sync succeeded for shift ${shift?.id || 'unknown'} with batch ${batchId}.`);
    return { success: true, requestId: lastRequestId };
  } catch (error) {
    logger.error('Cloud sync failed.', {
      error: error.message,
      code: error.code,
      status: error.status,
      requestId: error.requestId,
    });
    return { success: false, retryable: true, reason: 'upload_failed', requestId: error.requestId };
  }
}
