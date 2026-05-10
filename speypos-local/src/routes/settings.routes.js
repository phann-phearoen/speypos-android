import { Router } from 'express';
import {
  getAllSettings,
  getSetting,
  upsertSetting,
} from '../controllers/settings.controller.js';
import { isAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// Public routes to read settings
router.get('/settings', getAllSettings);
router.get('/settings/:key', getSetting);

// Admin-only route to write settings
router.put('/settings/:key', isAdmin, upsertSetting);

export default router;
