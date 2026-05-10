import * as settingsService from '../services/settings.service.js';
import * as setupService from '../services/setup.service.js';
import { logger } from '../utils/logger.js';
import { shutdown } from '../system/lifecycle.js';
import { ValidationError } from '../validators/store-payment-profile.validator.js';

/**
 * Handles the one-time system initialization request.
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next middleware function.
 */
export async function initialize(req, res, next) {
  try {
    // Double-check that the system is not already initialized
    if (settingsService.getBoolean('system.initialized')) {
      logger.warn('Attempted to run setup on an already initialized system.');
      return res.status(403).json({ error: 'System is already initialized.' });
    }

    const { admin_user, store, settings } = req.body;

    // Basic validation
    if (!admin_user || !admin_user.name || !admin_user.password) {
      return res.status(400).json({ error: 'Admin user with name and password is required.' });
    }
    if (!store || !store.name) {
      return res.status(400).json({ error: 'Store object with a name is required.' });
    }
    if (settings && !Array.isArray(settings)) {
      return res.status(400).json({ error: 'If provided, settings must be an array.' });
    }

    // Prepare setup data with defaults
    const setupData = {
      admin_user,
      store: {
        ...store,
        currency: store.currency || 'KHR',
        language: store.language || 'en',
      },
      settings: settings || [],
    };

    // Perform the setup
    setupService.performInitialSetup(setupData);

    // Immediately send the success response
    res.status(200).json({
      message:
        'System initialized successfully. Please call the /api/system/reboot endpoint to restart the server.',
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    logger.error('Failed to initialize system', {
      error: error.message,
      stack: error.stack,
    });
    next(error);
  }
}
