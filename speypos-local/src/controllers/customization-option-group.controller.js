import * as repo from '../storage/repositories/customization-option-group.repo.js';
import { logger } from '../utils/logger.js';

export async function getGroups(req, res) {
  try {
    const result = repo.getAll();
    res.status(200).json(result);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export async function getGroup(req, res) {
  try {
    const result = repo.getById(req.params.id);
    if (result) {
      res.status(200).json(result);
    } else {
      res.status(404).json({ error: 'Group not found' });
    }
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export async function createGroup(req, res) {
  try {
    const { name, selection_type, required = false, sort_order = 0, default_option_id } = req.body;
    if (!name || !selection_type) {
      return res.status(400).json({ error: 'Missing required fields: name, selection_type' });
    }
    const result = repo.create({ name, selection_type, required, sort_order, default_option_id });
    res.status(201).json(result);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export async function updateGroup(req, res) {
  try {
    const existing = repo.getById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Group not found' });
    }
    const result = repo.update(req.params.id, req.body);
    res.status(200).json(result);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export async function deleteGroup(req, res) {
  try {
    const result = repo.remove(req.params.id);
    if (result.changes > 0) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Group not found' });
    }
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
