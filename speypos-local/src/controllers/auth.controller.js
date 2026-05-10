import * as staffRepo from '../storage/repositories/staff.repo.js';
import { verifyPassword } from '../utils/hash.js';
import { logger } from '../utils/logger.js';

/**
 * Handles a staff member login request.
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 */
export function login(req, res) {
  try {
    const { name, password } = req.body;
    if (!name || !password) {
      return res.status(400).json({ error: 'Missing required fields: name and password' });
    }

    const staffMember = staffRepo.getStaffByNameForAuth(name);
    if (!staffMember) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordCorrect = verifyPassword(password, staffMember.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // On successful login, return the user object without the password hash
    const { password: _, ...staffDetails } = staffMember;
    res.status(200).json(staffDetails);

  } catch (error) {
    logger.error('Login failed', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
