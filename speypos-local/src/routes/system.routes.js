import { Router  } from 'express';
import * as systemController from '../controllers/system.controller.js';

const router = Router();

/**
 * @swagger
 * /api/system/setup-status:
 *   get:
 *     summary: Get the system's initialization status.
 *     description: Checks if the initial setup process has been completed. This is used by the UI to determine whether to show the setup screen or the main application.
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: The current initialization status.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 initialized:
 *                   type: boolean
 *                   example: true
 *       500:
 *         description: Internal server error.
 */
router.get('/system/setup-status', systemController.getSetupStatus);
router.get('/system/runtime-status', systemController.getRuntimeStatusSnapshot);
router.get('/system/readiness', systemController.getReadinessStatus);

/**
 * @swagger
 * /api/system/reboot:
 *   post:
 *     summary: Trigger a server reboot.
 *     description: |
 *       Initiates a graceful shutdown of the server.
 *       The runtime supervisor is expected to automatically restart the process.
 *       This is required after completing the initial setup or making other critical configuration changes.
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: The server has received the reboot command and is shutting down.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Server is shutting down for a reboot.'
 */
router.post('/system/reboot', systemController.reboot);

/**
 * @swagger
 * /api/system/pending-actions:
 *   get:
 *     summary: Get the status of pending background actions.
 *     description: Retrieves counts of critical background tasks that have not yet completed, such as printing receipts or reporting data to Telegram.
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: A summary of pending actions.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hasUnprintedOrders:
 *                   type: boolean
 *                 unprintedOrdersCount:
 *                   type: integer
 *                 hasUnreportedOrders:
 *                   type: boolean
 *                 unreportedOrdersCount:
 *                   type: integer
 *                 hasUnreportedShifts:
 *                   type: boolean
 *                 unreportedShiftsCount:
 *                   type: integer
 *       500:
 *         description: Internal server error.
 */
router.get('/system/pending-actions', systemController.getPendingActionsStatus);

/**
 * @swagger
 * /api/system/retry-jobs:
 *   post:
 *     summary: Manually trigger retry jobs for all pending actions.
 *     description: Initiates background jobs to re-process failed actions, such as re-printing orders or re-sending Telegram reports. The endpoint responds immediately.
 *     tags:
 *       - System
 *     responses:
 *       202:
 *         description: The retry jobs have been triggered successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Retry jobs have been triggered.'
 *       500:
 *         description: Internal server error.
 */
router.post('/system/retry-jobs', systemController.runRetryJobs);

export default router;
