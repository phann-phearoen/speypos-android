import { logger } from '../utils/logger.js';

/**
 * Middleware to check if the user has an 'admin' role.
 * It checks for a custom 'X-User-Role' header.
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next function.
 */
export function isAdmin(req, res, next) {
  const userRole = req.headers['x-user-role'];

  if (userRole === 'admin') {
    next();
  } else {
    logger.warn('Forbidden access attempt', { 
      role: userRole, 
      path: req.originalUrl,
      ip: req.ip 
    });
    res.status(403).json({ error: 'Forbidden: Administrator access required.' });
  }
}
