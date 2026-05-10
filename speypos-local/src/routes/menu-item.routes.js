import { Router } from 'express';
import {
  getMenuItems,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from '../controllers/menu-item.controller.js';
import { isAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// Public routes
router.get('/menu-item', getMenuItems);
router.get('/menu-item/:id', getMenuItem);

// Protected admin routes
router.post('/menu-item', isAdmin, createMenuItem);
router.patch('/menu-item/:id', isAdmin, updateMenuItem);
router.delete('/menu-item/:id', isAdmin, deleteMenuItem);

export default router;
