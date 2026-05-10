import { Router } from 'express';
import { getGroups, getGroup, createGroup, updateGroup, deleteGroup } from '../controllers/topping-group.controller.js';
import { isAdmin } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/topping-group', getGroups);
router.get('/topping-group/:id', getGroup);
router.post('/topping-group', isAdmin, createGroup);
router.patch('/topping-group/:id', isAdmin, updateGroup);
router.delete('/topping-group/:id', isAdmin, deleteGroup);

export default router;
