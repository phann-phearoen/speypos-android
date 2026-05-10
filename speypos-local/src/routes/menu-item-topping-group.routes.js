import { Router } from 'express';
import { getMaps, createMap, deleteMap } from '../controllers/menu-item-topping-group.controller.js';
import { isAdmin } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/menu-item-topping-group', getMaps);
router.post('/menu-item-topping-group', isAdmin, createMap);
router.delete('/menu-item-topping-group/:id', isAdmin, deleteMap);

export default router;
