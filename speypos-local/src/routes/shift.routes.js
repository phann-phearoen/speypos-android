import { Router } from 'express';
import {
  getShifts,
  getShift,
  getOpenShifts,
  createShift,
  updateShift,
  deleteShift,
  openShift,
  closeDay,
  getDayCloseReview,
} from '../controllers/shift.controller.js';

const router = Router();

// Business logic endpoints
router.post('/shifts/open', openShift);
router.get('/shift/close-day', getDayCloseReview);
router.post('/shift/close-day', closeDay);

// Standard CRUD endpoints
router.get('/shift', getShifts);
router.get('/shift/open', getOpenShifts);
router.get('/shift/:id', getShift);
router.post('/shift', createShift);
router.patch('/shift/:id', updateShift);
router.delete('/shift/:id', deleteShift);

export default router;