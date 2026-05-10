import * as menuCategoryRepo from '../storage/repositories/menu-category.repo.js';
import * as menuCategorySerializer from '../serializers/menu-category.serializer.js';
import { logger } from '../utils/logger.js';
import { randomUUID } from 'crypto';

/**
 * Handles the request to get all menu categories.
 */
export function getMenuCategories(req, res) {
  try {
    const items = menuCategoryRepo.getAllMenuCategories();
    const serializedItems = menuCategorySerializer.serializeCategories(items);
    res.status(200).json(serializedItems);
  } catch (error) {
    logger.error('Failed to get menu categories', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to get a single menu category by its ID.
 */
export function getMenuCategory(req, res) {
  try {
    const { id } = req.params;
    const item = menuCategoryRepo.getMenuCategoryById(id);
    if (item) {
      const serializedItem = menuCategorySerializer.serializeCategory(item);
      res.status(200).json(serializedItem);
    } else {
      res.status(404).json({ error: `Menu category with ID ${id} not found` });
    }
  } catch (error) {
    logger.error('Failed to get menu category', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to create a new menu category.
 */
export function createMenuCategory(req, res) {
  try {
    const { name, image_url = null, sort_order = 0 } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Missing required field: name' });
    }

    const newCategoryData = {
      id: randomUUID(),
      name,
      image_url,
      sort_order,
      created_at: Date.now(),
    };

    const createdItem = menuCategoryRepo.createMenuCategory(newCategoryData);
    res.status(201).json(createdItem);
  } catch (error) {
    logger.error('Failed to create menu category', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to update an existing menu category.
 */
export function updateMenuCategory(req, res) {
  try {
    const { id } = req.params;
    const item = menuCategoryRepo.getMenuCategoryById(id);
    if (!item) {
      return res.status(404).json({ error: `Menu category with ID ${id} not found` });
    }

    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'Request body cannot be empty for a PATCH request' });
    }

    const updatedItem = menuCategoryRepo.updateMenuCategory(id, req.body);
    res.status(200).json(updatedItem);
  } catch (error) {
    logger.error('Failed to update menu category', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to delete a menu category.
 */
export function deleteMenuCategory(req, res) {
  try {
    const { id } = req.params;
    const result = menuCategoryRepo.deleteMenuCategory(id);
    if (result.changes > 0) {
      res.status(204).send(); // No Content
    } else {
      res.status(404).json({ error: `Menu category with ID ${id} not found` });
    }
  } catch (error) {
    logger.error('Failed to delete menu category', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
