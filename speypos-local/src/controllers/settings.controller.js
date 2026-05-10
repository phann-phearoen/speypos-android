import { env } from '../config/env.js';
import * as settingsService from '../services/settings.service.js';
import * as settingsRepo from '../storage/repositories/settings.repo.js';
import { performHandshake } from '../services/cloudHandshake.service.js';
import { logger } from '../utils/logger.js';
import { ValidationError } from '../validators/settings.validator.js';

/**
 * Handles the request to get all settings.
 * Returns a list of settings with their values cast to the correct type.
 * Special handling is applied to 'telegram.intents' to provide a more structured
 * response for UI consumption.
 */
export function getAllSettings(req, res) {
  try {
    const allSettings = settingsRepo.getAllSettings();

    const typedSettings = allSettings.map((s) => {
      const value = settingsService.get(s.key);
      return { ...s, value };
    });

    res.status(200).json(typedSettings);
  } catch (error) {
    logger.error('Failed to get all settings', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to get a single setting by its key.
 */
export function getSetting(req, res) {
  try {
    const { key } = req.params;
    const setting = settingsRepo.getSettingByKey(key);

    if (setting) {
      // Return the setting with its value correctly typed from the service cache
      const value = settingsService.get(key);
      res.status(200).json({ ...setting, value });
    } else {
      res.status(404).json({ error: `Setting with key '${key}' not found.` });
    }
  } catch (error) {
    logger.error(`Failed to get setting for key: ${req.params.key}`, { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to create or update a setting.
 */
export async function upsertSetting(req, res) {
  try {
    const { key } = req.params;
    const { value, value_type, category, description } = req.body;

    if (value === undefined || !value_type || !category) {
      return res
        .status(400)
        .json({ error: 'Missing required fields: value, value_type, and category.' });
    }

    const validTypes = ['string', 'number', 'boolean', 'json'];
    if (!validTypes.includes(value_type)) {
      return res
        .status(400)
        .json({ error: `Invalid value_type. Must be one of: ${validTypes.join(', ')}` });
    }

    const settingData = {
      key,
      value,
      value_type,
      category,
      description: description || null,
    };

    if (key === 'cloud.sync' && value_type === 'json') {
      const current = settingsService.getJSON('cloud.sync') || {};
      const merged = {
        ...current,
        ...value,
        version: 1,
      };

      // Default base_url if omitted.
      merged.base_url = merged.base_url || current.base_url || env.cloudBaseUrl;

      const apiKeyChanged = merged.api_key && merged.api_key !== current.api_key;
      const baseUrlChanged = merged.base_url !== current.base_url;
      const missingStoreId = !merged.store_id;
      const shouldHandshake = merged.api_key && (apiKeyChanged || baseUrlChanged || missingStoreId);

      if (shouldHandshake) {
        try {
          const handshakeResult = await performHandshake({
            apiKey: merged.api_key,
            baseUrl: merged.base_url,
          });

          merged.store_id = handshakeResult.store_id;
          merged.store_linked_at = handshakeResult.store_linked_at;
          merged.store_client_name = handshakeResult.store_client_name;
          merged.store_last_seen_at = handshakeResult.store_last_seen_at;
        } catch (error) {
          logger.error('Cloud handshake failed during settings update', {
            error: error.message,
            code: error.code,
            status: error.status,
            requestId: error.requestId,
          });
          return res.status(400).json({
            error: `Cloud handshake failed: ${error.message}`,
            request_id: error.requestId,
            code: error.code,
          });
        }
      }

      settingData.value = merged;
    }

    const updatedSetting = settingsService.set(settingData);
    res.status(200).json(updatedSetting);
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    logger.error(`Failed to upsert setting for key: ${req.params.key}`, {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
