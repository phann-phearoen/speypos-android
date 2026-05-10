import * as mapRepo from '../storage/repositories/menu-item-category-map.repo.js';
import { logger } from '../utils/logger.js';
import { randomUUID } from 'crypto';

/**
 * Handles the request to get all menu item-category mappings.
 * Supports filtering via query parameters.
 */
export function getMaps(req, res) {
  try {
    const items = mapRepo.getMenuItemCategoryMaps(req.query);
    res.status(200).json(items);
  } catch (error) {
    logger.error('Failed to get menu item-category maps', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to create a new menu item-category mapping.
 */
export function createMap(req, res) {
  try {
    const { menu_item_id, menu_category_id } = req.body;
    if (!menu_item_id || !menu_category_id) {
      return res.status(400).json({ error: 'Missing required fields: menu_item_id and menu_category_id' });
    }

    const newMapData = {
      id: randomUUID(),
      menu_item_id,
      menu_category_id,
    };

    const createdMap = mapRepo.createMenuItemCategoryMap(newMapData);
    res.status(201).json(createdMap);
  } catch (error) {
    logger.error('Failed to create menu item-category map', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to delete a menu item-category mapping.
 */
export function deleteMap(req, res) {
  try {
    const { id } = req.params;
    const result = mapRepo.deleteMenuItemCategoryMap(id);
    if (result.changes > 0) {
      res.status(204).send(); // No Content
    } else {
      res.status(404).json({ error: `Menu item-category map with ID ${id} not found` });
    }
  } catch (error) {
    logger.error('Failed to delete menu item-category map', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
