import * as staffRepo from '../storage/repositories/staff.repo.js';
import { logger } from '../utils/logger.js';
import { randomUUID } from 'crypto';

/**
 * Handles the request to get all staff members.
 */
export function getStaffMembers(req, res) {
  try {
    const items = staffRepo.getAllStaff();
    res.status(200).json(items);
  } catch (error) {
    logger.error('Failed to get staff members', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to get a single staff member by their ID.
 */
export function getStaffMember(req, res) {
  try {
    const { id } = req.params;
    const item = staffRepo.getStaffById(id);
    if (item) {
      res.status(200).json(item);
    } else {
      res.status(404).json({ error: `Staff member with ID ${id} not found` });
    }
  } catch (error) {
    logger.error('Failed to get staff member', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to create a new staff member.
 */
export function createStaffMember(req, res) {
  try {
    const { name, role, password, status = 'active' } = req.body;
    if (!name || !role || !password) {
      return res.status(400).json({ error: 'Missing required fields: name, role, and password' });
    }

    const newStaffData = {
      id: randomUUID(),
      name,
      role,
      password,
      status,
      created_at: Date.now(),
    };

    const createdItem = staffRepo.createStaff(newStaffData);
    res.status(201).json(createdItem);
  } catch (error) {
    logger.error('Failed to create staff member', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to update an existing staff member.
 */
export function updateStaffMember(req, res) {
  try {
    const { id } = req.params;
    const item = staffRepo.getStaffById(id);
    if (!item) {
      return res.status(404).json({ error: `Staff member with ID ${id} not found` });
    }

    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'Request body cannot be empty for a PATCH request' });
    }

    const updatedItem = staffRepo.updateStaff(id, req.body);
    res.status(200).json(updatedItem);
  } catch (error) {
    logger.error('Failed to update staff member', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to delete a staff member.
 */
export function deleteStaffMember(req, res) {
  try {
    const { id } = req.params;
    const result = staffRepo.deleteStaff(id);
    if (result.changes > 0) {
      res.status(204).send(); // No Content
    } else {
      res.status(404).json({ error: `Staff member with ID ${id} not found` });
    }
  } catch (error) {
    logger.error('Failed to delete staff member', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
