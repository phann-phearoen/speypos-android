import { Router } from 'express';
import { getGroups, getGroup, createGroup, updateGroup, deleteGroup } from '../controllers/customization-option-group.controller.js';
import { isAdmin } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/customization-option-group', getGroups);
router.get('/customization-option-group/:id', getGroup);
router.post('/customization-option-group', isAdmin, createGroup);
router.patch('/customization-option-group/:id', isAdmin, updateGroup);
router.delete('/customization-option-group/:id', isAdmin, deleteGroup);

export default router;
