import * as repo from '../storage/repositories/menu-category-topping-group.repo.js';
import { logger } from '../utils/logger.js';

export async function getMaps(req, res) {
  try {
    const result = repo.getMaps(req.query);
    res.status(200).json(result);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export async function createMap(req, res) {
  try {
    const { menu_category_id, topping_group_id } = req.body;
    if (!menu_category_id || !topping_group_id) {
      return res.status(400).json({ error: 'Missing required fields: menu_category_id, topping_group_id' });
    }
    const result = repo.createMap({ menu_category_id, topping_group_id });
    res.status(201).json(result);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export async function deleteMap(req, res) {
  try {
    const result = repo.remove(req.params.id);
    if (result.changes > 0) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Mapping not found' });
    }
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
