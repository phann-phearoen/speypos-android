import { Router } from 'express';
import { getMaps, createMap, deleteMap } from '../controllers/menu-category-topping-group.controller.js';
import { isAdmin } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/menu-category-topping-groups', getMaps);
router.post('/menu-category-topping-groups', isAdmin, createMap);
router.delete('/menu-category-topping-groups/:id', isAdmin, deleteMap);

export default router;
