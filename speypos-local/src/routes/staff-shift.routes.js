import { Router } from 'express';
import {
  getMaps,
  createMap,
  deleteMap,
} from '../controllers/staff-shift.controller.js';

const router = Router();

router.get('/staff-shift', getMaps);
router.post('/staff-shift', createMap);
router.delete('/staff-shift/:id', deleteMap);

export default router;
