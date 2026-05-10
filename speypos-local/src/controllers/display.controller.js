import * as displayService from '../services/display.service.js';
import { logger } from '../utils/logger.js';

/**
 * Handles the request to get the current customer display state from the session.
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next middleware function.
 */
export async function getCurrentState(req, res, next) {
  try {
    const state = await displayService.getCurrentDisplaySession();
    res.status(200).json(state);
  } catch (error) {
    logger.error('Failed to get display state', {
      error: error.message,
      stack: error.stack,
    });
    next(error);
  }
}

/**
 * Handles the request to update the customer display session.
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next middleware function.
 */
export async function updateSession(req, res, next) {
  try {
    const { state, items, total, received_cash, change, payment_type } = req.body;
    
    // Validation
    if (!state || !['IDLE', 'ORDERING', 'PAYING', 'COMPLETED'].includes(state)) {
      return res.status(400).json({ 
        error: 'Invalid state. Must be IDLE, ORDERING, PAYING, or COMPLETED' 
      });
    }
    
    if (state === 'ORDERING' && (!items || !Array.isArray(items) || total === undefined)) {
      return res.status(400).json({ 
        error: 'ORDERING state requires items array and total' 
      });
    }
    
    if (state === 'PAYING' && total === undefined) {
      return res.status(400).json({ 
        error: 'PAYING state requires total' 
      });
    }
    
    await displayService.updateDisplaySession({
      state,
      items: state === 'ORDERING' ? items : undefined,
      total: ['ORDERING', 'PAYING'].includes(state) ? total : undefined,
      received_cash: state === 'PAYING' ? received_cash : undefined,
      change: state === 'PAYING' ? change : undefined,
      payment_type: state === 'PAYING' ? payment_type : undefined,
    });
    
    res.status(204).send();
  } catch (error) {
    logger.error('Failed to update display session', {
      error: error.message,
      stack: error.stack,
    });
    next(error);
  }
}