import * as menuItemRepo from '../storage/repositories/menu-item.repo.js';
import { serializeManyMenuItems, serializeMenuItem } from '../serializers/menu-item.serializer.js';
import { logger } from '../utils/logger.js';
import { randomUUID } from 'crypto';

/**
 * Handles the request to get all menu items.
 */
export function getMenuItems(req, res) {
  try {
    const items = menuItemRepo.getAllMenuItems();
    const serializedItems = serializeManyMenuItems(items);
    res.status(200).json(serializedItems);
  } catch (error) {
    logger.error('Failed to get menu items', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to get a single menu item by its ID.
 */
export function getMenuItem(req, res) {
  try {
    const { id } = req.params;
    const item = menuItemRepo.getMenuItemById(id);
    if (item) {
      const serializedItem = serializeMenuItem(item);
      res.status(200).json(serializedItem);
    } else {
      res.status(404).json({ error: `Menu item with ID ${id} not found` });
    }
  } catch (error) {
    logger.error('Failed to get menu item', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to create a new menu item.
 */
export function createMenuItem(req, res) {
  try {
    const { name, price, image_url = null } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Missing required fields: name and price' });
    }

    const newItemData = {
      id: randomUUID(),
      name,
      price,
      image_url,
      created_at: Date.now(),
    };

    const createdItem = menuItemRepo.createMenuItem(newItemData);
    const serializedItem = serializeMenuItem(createdItem);
    res.status(201).json(serializedItem);
  } catch (error) {
    logger.error('Failed to create menu item', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to update an existing menu item.
 */
export function updateMenuItem(req, res) {
  try {
    const { id } = req.params;
    const item = menuItemRepo.getMenuItemById(id);
    if (!item) {
      return res.status(404).json({ error: `Menu item with ID ${id} not found` });
    }

    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'Request body cannot be empty for a PATCH request' });
    }

    const updatedItem = menuItemRepo.updateMenuItem(id, req.body);
    const serializedItem = serializeMenuItem(updatedItem);
    res.status(200).json(serializedItem);
  } catch (error) {
    logger.error('Failed to update menu item', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to delete a menu item.
 */
export function deleteMenuItem(req, res) {
  try {
    const { id } = req.params;
    const result = menuItemRepo.deleteMenuItem(id);
    if (result.changes > 0) {
      res.status(204).send(); // No Content
    } else {
      res.status(404).json({ error: `Menu item with ID ${id} not found` });
    }
  } catch (error) {
    logger.error('Failed to delete menu item', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}