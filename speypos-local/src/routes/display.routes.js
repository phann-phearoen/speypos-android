import { Router } from 'express';
import * as displayController from '../controllers/display.controller.js';

const router = Router();

/**
 * @swagger
 * /api/display/current:
 *   get:
 *     summary: Get the current state for the customer-facing display.
 *     description: |
 *       Poll this endpoint to get the real-time state of the POS.
 *       - When no order is active, poll without a query parameter.
 *       - Once an 'ORDERING' state is received, use the returned `order.id`
 *         in the `orderId` query parameter for all subsequent polls for that order.
 *     parameters:
 *       - in: query
 *         name: orderId
 *         schema:
 *           type: string
 *         description: The ID of the order being tracked. Omit for initial polling.
 *     responses:
 *       200:
 *         description: The current display state.
 *         content:
 *           application/json:
 *             examples:
 *               IDLE:
 *                 value:
 *                   state: "IDLE"
 *               ORDERING:
 *                 value:
 *                   state: "ORDERING"
 *                   order:
 *                     id: "ord_123"
 *                     items: []
 *                     total: 1500
 *                     currency: "USD"
 *               PAYING:
 *                 value:
 *                   state: "PAYING"
 *                   order:
 *                     id: "ord_123"
 *                     items: []
 *                     total: 1500
 *                     received_cash: 2000
 *                     change: 500
 *                     currency: "USD"
 *               COMPLETED:
 *                 value:
 *                   state: "COMPLETED"
 *                   message: "Thank you!"
 *       500:
 *         description: Internal server error.
 */
router.get('/display/current', displayController.getCurrentState);
router.post('/display/session', displayController.updateSession);

export default router;
