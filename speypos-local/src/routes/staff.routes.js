import { Router } from 'express';
import {
  getStaffMembers,
  getStaffMember,
  createStaffMember,
  updateStaffMember,
  deleteStaffMember,
} from '../controllers/staff.controller.js';
import { isAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// Write and delete operations are restricted to admin users, read operations are public
router.get('/staff', getStaffMembers);
router.get('/staff/:id', getStaffMember);
router.post('/staff', isAdmin, createStaffMember);
router.patch('/staff/:id', isAdmin, updateStaffMember);
router.delete('/staff/:id', isAdmin, deleteStaffMember);

export default router;
