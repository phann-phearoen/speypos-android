import { Router } from 'express';
import { getMaps, createMap, deleteMap } from '../controllers/menu-item-customization-group.controller.js';
import { isAdmin } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/menu-item-customization-group', getMaps);
router.post('/menu-item-customization-group', isAdmin, createMap);
router.delete('/menu-item-customization-group/:id', isAdmin, deleteMap);

export default router;
