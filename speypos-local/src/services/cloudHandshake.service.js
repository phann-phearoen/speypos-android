import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

function normalizeBaseUrl(baseUrl, fallback) {
  if (!baseUrl || typeof baseUrl !== 'string') return fallback;
  return baseUrl.replace(/\/+$/, '');
}

/**
 * Performs a handshake with the cloud to resolve the canonical store identity.
 * Returns cloud store metadata that should be persisted in cloud.sync settings.
 */
export async function performHandshake({ apiKey, baseUrl }) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl, env.cloudBaseUrl);
  const url = `${normalizedBaseUrl}/pos/handshake`;

  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    throw new Error('Cloud handshake requires a non-empty api_key');
  }

  logger.info('Cloud handshake starting.', { url: normalizedBaseUrl });

  let json = {};
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify({}),
  });

  try {
    json = await response.json();
  } catch (error) {
    json = {};
  }

  const requestId = json?.meta?.request_id;

  if (!response.ok) {
    const message = json?.errors?.[0]?.message || response.statusText;
    const code = json?.errors?.[0]?.code;
    const error = new Error(message);
    error.code = code;
    error.status = response.status;
    error.requestId = requestId;
    throw error;
  }

  const storeClient = json?.data?.store_client || json?.data?.store || json?.data || {};
  const storeId = storeClient?.id || json?.data?.store_id;
  const storeIdString = typeof storeId === 'number' ? storeId.toString() : storeId;

  if (!storeIdString) {
    const error = new Error('Cloud handshake: missing store id in response');
    error.requestId = requestId;
    throw error;
  }

  const metadata = {
    store_id: storeIdString,
    store_linked_at: storeClient?.linked_at || null,
    store_client_name: storeClient?.name || null,
    store_last_seen_at: storeClient?.last_seen_at || null,
    requestId,
  };

  logger.info('Cloud handshake succeeded.', { storeId: storeIdString, requestId });
  return metadata;
}
