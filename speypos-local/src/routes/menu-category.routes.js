import { Router } from 'express';
import {
  getMenuCategories,
  getMenuCategory,
  createMenuCategory,
  updateMenuCategory,
  deleteMenuCategory,
} from '../controllers/menu-category.controller.js';
import { isAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// Public routes
router.get('/menu-category', getMenuCategories);
router.get('/menu-category/:id', getMenuCategory);

// Protected admin routes
router.post('/menu-category', isAdmin, createMenuCategory);
router.patch('/menu-category/:id', isAdmin, updateMenuCategory);
router.delete('/menu-category/:id', isAdmin, deleteMenuCategory);

export default router;