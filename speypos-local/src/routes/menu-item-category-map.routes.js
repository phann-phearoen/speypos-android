import { Router } from 'express';
import {
  getMaps,
  createMap,
  deleteMap,
} from '../controllers/menu-item-category-map.controller.js';

const router = Router();

router.get('/menu-item-category-map', getMaps);
router.post('/menu-item-category-map', createMap);
router.delete('/menu-item-category-map/:id', deleteMap);

export default router;
