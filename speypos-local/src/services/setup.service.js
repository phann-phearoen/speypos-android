import { randomUUID } from 'crypto';
import * as staffRepo from '../storage/repositories/staff.repo.js';
import * as storeRepo from '../storage/repositories/store.repo.js';
import * as settingsService from './settings.service.js';
import { getDb } from '../storage/database.js';
import { logger } from '../utils/logger.js';
import { validatePaymentProfile } from '../validators/store-payment-profile.validator.js';

/**
 * Performs the initial system setup in a single transaction.
 * - Creates the store.
 * - Creates the admin user.
 * - Saves initial behavioral settings (optional).
 * - Sets the system as initialized.
 * @param {object} setupData - The data from the setup form.
 */
export function performInitialSetup(setupData) {
  const { admin_user, store, settings } = setupData;
  const db = getDb();

  const transaction = db.transaction(() => {
    // 1. Create the Store
    logger.info(`Creating store "${store.name}"...`);
    if (Object.prototype.hasOwnProperty.call(store, 'payment_profile')) {
      validatePaymentProfile(store.payment_profile);
    }
    storeRepo.create(store);

    // 2. Create Admin User
    logger.info('Creating initial admin user...');
    staffRepo.createStaff({
      id: randomUUID(),
      name: admin_user.name,
      password: admin_user.password,
      role: 'admin',
      status: 'active',
      created_at: Date.now(),
    });

    // 3. Save all provided settings, if any
    if (settings && settings.length > 0) {
      logger.info(`Saving ${settings.length} initial settings...`);
      for (const setting of settings) {
        settingsService.set(setting);
      }
    }

    // 4. Mark system as initialized
    logger.info('Marking system as initialized...');
    settingsService.set({
      key: 'system.initialized',
      value: true,
      value_type: 'boolean',
      category: 'system',
      description: 'Indicates if the initial setup has been completed.',
    });
  });

  try {
    transaction();
    logger.info('Initial setup completed successfully.');
  } catch (error) {
    logger.error('Initial setup failed. Transaction rolled back.', { error: error.message });
    throw new Error('Setup failed. See logs for details.');
  }
}

export function isSystemInitialized() {
  return settingsService.getBoolean('system.initialized');
}
