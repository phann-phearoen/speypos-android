import { Router } from 'express';
import * as setupController from '../controllers/setup.controller.js';

const router = Router();

/**
 * @swagger
 * /api/setup/initialize:
 *   post:
 *     summary: Perform the one-time system initialization.
 *     description: |
 *       This endpoint is only available if the system has not been initialized yet.
 *       It creates the store identity, the initial admin user, and saves optional behavioral settings.
 *       After a successful run, the client must call the `/api/system/reboot` endpoint to restart the server.
 *     tags:
 *       - Setup
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - admin_user
 *               - store
 *             properties:
 *               admin_user:
 *                 type: object
 *                 description: The initial administrator account.
 *                 required:
 *                   - name
 *                   - password
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: 'admin'
 *                   password:
 *                     type: string
 *                     example: 'password123'
 *               store:
 *                 type: object
 *                 description: The store's identity information.
 *                 required:
 *                   - name
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: 'My Awesome Cafe'
 *                   language:
 *                     type: string
 *                     description: 'Language code. Defaults to `en`.'
 *                     example: 'en'
 *                   currency:
 *                     type: string
 *                     description: '3-letter currency code. Defaults to `KHR`.'
 *                     example: 'USD'
 *               settings:
 *                 type: array
 *                 description: An optional list of initial behavioral settings.
 *                 items:
 *                   type: object
 *                   properties:
 *                     key:
 *                       type: string
 *                     value:
 *                       type: string
 *                     value_type:
 *                       type: string
 *                     category:
 *                       type: string
 *     responses:
 *       200:
 *         description: System initialized successfully. The client must now call the reboot endpoint.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'System initialized successfully. Please call the /api/system/reboot endpoint to restart the server.'
 *       400:
 *         description: Invalid request body (e.g., missing required fields).
 *       403:
 *         description: System is already initialized.
 *       500:
 *         description: Internal server error during setup.
 */
router.post('/initialize', setupController.initialize);

export default router;
