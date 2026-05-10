import { Router } from 'express';
import * as storeController from '../controllers/store.controller.js';
import { isAdmin } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * /api/store:
 *   get:
 *     summary: Get the current store's details.
 *     description: Retrieves the complete store identity object, including name, currency, language, and branding information. Requires admin privileges.
 *     tags:
 *       - Store
 *     security:
 *       - AdminHeader: []
 *     responses:
 *       200:
 *         description: The current store object.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 language:
 *                   type: string
 *                 currency:
 *                   type: string
 *                 brand_name:
 *                   type: string
 *                 logo_url:
 *                   type: string
 *                 address:
 *                   type: string
 *       403:
 *         description: Forbidden. Administrator access required.
 *       500:
 *         description: Internal server error.
 */
router.get('/store', storeController.get);

/**
 * @swagger
 * /api/store:
 *   patch:
 *     summary: Update the store's details.
 *     description: |
 *       Updates one or more attributes of the store's identity.
 *       Only the fields provided in the request body will be updated.
 *       Requires admin privileges.
 *     tags:
 *       - Store
 *     security:
 *       - AdminHeader: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: 'My Awesome Cafe 2.0'
 *               language:
 *                 type: string
 *                 example: 'km'
 *               currency:
 *                 type: string
 *                 example: 'KHR'
 *               brand_name:
 *                 type: string
 *                 example: 'The Awesome Brand'
 *               logo_url:
 *                 type: string
 *                 example: '/media/store/new-logo.png'
 *               address:
 *                 type: string
 *               payment_profile:
 *                 type: object
 *                 description: Versioned payment configuration for customer-facing methods.
 *                 properties:
 *                   version:
 *                     type: number
 *                     example: 1
 *                   qr:
 *                     type: object
 *                     properties:
 *                       enabled:
 *                         type: boolean
 *                       image_url:
 *                         type: string
 *                         nullable: true
 *               payment_profile:
 *                 type: object
 *                 properties:
 *                   version:
 *                     type: number
 *                     example: 1
 *                   qr:
 *                     type: object
 *                     properties:
 *                       enabled:
 *                         type: boolean
 *                       image_url:
 *                         type: string
 *                         nullable: true
 *                 example: '123 Main St, Phnom Penh'
 *     responses:
 *       200:
 *         description: The full, updated store object.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Store'
 *       403:
 *         description: Forbidden. Administrator access required.
 *       500:
 *         description: Internal server error.
 *
 * components:
 *   securitySchemes:
 *     AdminHeader:
 *       type: apiKey
 *       in: header
 *       name: X-User-Role
 *   schemas:
 *     Store:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         language:
 *           type: string
 *         currency:
 *           type: string
 *         brand_name:
 *           type: string
 *         logo_url:
 *           type: string
 *         address:
 *           type: string
 */
router.patch('/store', isAdmin, storeController.update);

export default router;
