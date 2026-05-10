import * as mapRepo from '../storage/repositories/staff-shift.repo.js';
import { logger } from '../utils/logger.js';
import { randomUUID } from 'crypto';

/**
 * Handles the request to get all staff-shift mappings.
 * Supports filtering via query parameters.
 */
export function getMaps(req, res) {
  try {
    const items = mapRepo.getStaffShiftMaps(req.query);
    res.status(200).json(items);
  } catch (error) {
    logger.error('Failed to get staff-shift maps', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to create a new staff-shift mapping.
 */
export function createMap(req, res) {
  try {
    const { shift_id, staff_id } = req.body;
    if (!shift_id || !staff_id) {
      return res.status(400).json({ error: 'Missing required fields: shift_id and staff_id' });
    }

    const newMapData = {
      id: randomUUID(),
      shift_id,
      staff_id,
    };

    const createdMap = mapRepo.createStaffShiftMap(newMapData);
    res.status(201).json(createdMap);
  } catch (error) {
    logger.error('Failed to create staff-shift map', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to delete a staff-shift mapping.
 */
export function deleteMap(req, res) {
  try {
    const { id } = req.params;
    const result = mapRepo.deleteStaffShiftMap(id);
    if (result.changes > 0) {
      res.status(204).send(); // No Content
    } else {
      res.status(404).json({ error: `Staff-shift map with ID ${id} not found` });
    }
  } catch (error) {
    logger.error('Failed to delete staff-shift map', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
