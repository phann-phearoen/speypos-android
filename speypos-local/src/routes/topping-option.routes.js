import { Router } from 'express';
import { getOptions, getOption, createOption, updateOption, deleteOption } from '../controllers/topping-option.controller.js';
import { isAdmin } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/topping-option', getOptions);
router.get('/topping-option/:id', getOption);
router.post('/topping-option', isAdmin, createOption);
router.patch('/topping-option/:id', isAdmin, updateOption);
router.delete('/topping-option/:id', isAdmin, deleteOption);

export default router;
