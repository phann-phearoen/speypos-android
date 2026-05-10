import { Router } from 'express';
import { getMaps, createMap, deleteMap } from '../controllers/menu-category-customization-group.controller.js';
import { isAdmin } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: MenuCategoryCustomizationGroups
 *   description: API to manage the relationship between menu categories and customization option groups.
 */

/**
 * @swagger
 * /api/menu-category-customization-groups:
 *   get:
 *     summary: Retrieve all mappings between menu categories and customization groups.
 *     tags: [MenuCategoryCustomizationGroups]
 *     parameters:
 *       - in: query
 *         name: menu_category_id
 *         schema:
 *           type: string
 *         description: Filter mappings by menu category ID.
 *       - in: query
 *         name: customization_group_id
 *         schema:
 *           type: string
 *         description: Filter mappings by customization group ID.
 *     responses:
 *       200:
 *         description: A list of mappings.
 *
 *   post:
 *     summary: Link a customization group to a menu category.
 *     tags: [MenuCategoryCustomizationGroups]
 *     security:
 *       - AdminHeader: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - menu_category_id
 *               - customization_group_id
 *             properties:
 *               menu_category_id:
 *                 type: string
 *               customization_group_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: The mapping was created successfully.
 *       400:
 *         description: Missing required fields.
 *
 * /api/menu-category-customization-groups/{id}:
 *   delete:
 *     summary: Unlink a customization group from a menu category.
 *     tags: [MenuCategoryCustomizationGroups]
 *     security:
 *       - AdminHeader: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the mapping to delete.
 *     responses:
 *       204:
 *         description: The mapping was deleted successfully.
 *       404:
 *         description: Mapping not found.
 */

router.get('/menu-category-customization-groups', getMaps);
router.post('/menu-category-customization-groups', isAdmin, createMap);
router.delete('/menu-category-customization-groups/:id', isAdmin, deleteMap);

export default router;