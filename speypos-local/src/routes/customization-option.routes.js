import { Router } from 'express';
import { getOptions, getOption, createOption, updateOption, deleteOption } from '../controllers/customization-option.controller.js';
import { isAdmin } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/customization-option', getOptions);
router.get('/customization-option/:id', getOption);
router.post('/customization-option', isAdmin, createOption);
router.patch('/customization-option/:id', isAdmin, updateOption);
router.delete('/customization-option/:id', isAdmin, deleteOption);

export default router;
