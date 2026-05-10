import { Router } from 'express';
import { MediaController } from '../controllers/media.controller.js';
import { isAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// DELETE /api/media/:type/:filename
router.delete('/media/:type/:filename', isAdmin, MediaController.deleteImage);

export default router;
