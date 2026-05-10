import { Router } from 'express';
import { login } from '../controllers/auth.controller.js';

const router = Router();

// POST /api/auth/login
router.post('/auth/login', login);

export default router;
