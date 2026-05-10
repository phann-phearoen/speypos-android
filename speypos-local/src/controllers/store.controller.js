import * as storeService from '../services/store.service.js';
import { logger } from '../utils/logger.js';
import { ValidationError } from '../validators/store-payment-profile.validator.js';

/**
 * Handles the request to get the current store's details.
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 */
export function get(req, res) {
  try {
    const store = storeService.getStore();
    res.status(200).json(store);
  } catch (error) {
    logger.error('Failed to get store details', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to update the store's details.
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 */
export function update(req, res) {
  try {
    const updatedStore = storeService.updateStore(req.body);
    res.status(200).json(updatedStore);
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    logger.error('Failed to update store details', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
