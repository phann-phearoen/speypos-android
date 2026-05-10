import { Router } from 'express';
import { manualSyncShift } from '../controllers/sync.controller.js';
import { isAdmin } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/sync/orders', isAdmin, manualSyncShift);

export default router;
