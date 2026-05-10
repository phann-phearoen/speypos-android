import { Router } from 'express';
import { UploadController } from '../controllers/upload.controller.js';
import { isAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// POST /api/upload/:type
// This route is protected by three layers:
// 1. isAdmin: Ensures only admins can attempt an upload.
// 2. uploadMiddleware: Processes the multipart/form-data file.
// 3. handleUploadErrors: Catches any errors from multer (e.g., wrong file type).
// 4. handleUpload: The final controller if everything is successful.
router.post(
    '/upload/:type', 
    isAdmin, 
    UploadController.uploadMiddleware, 
    UploadController.handleUploadErrors,
    UploadController.handleUpload
);

export default router;
