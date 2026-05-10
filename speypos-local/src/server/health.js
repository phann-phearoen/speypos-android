import { getDb } from '../storage/database.js';
import { isSystemInitialized } from '../services/setup.service.js';

/**
 * Handles the /health endpoint.
 * Checks the status of critical services like the database.
 */
export function healthCheck(req, res) {
  try {
    const db = getDb();
    // A simple check to see if we can query the database
    db.pragma('integrity_check');

    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: 'ok',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Service unavailable',
      details: {
        database: 'error',
        message: error.message,
      },
    });
  }
}

export function getSetupStatus(req, res) {
  try {
    const isInitialized = isSystemInitialized();
    res.status(200).json({ initialized: isInitialized });
  } catch (error) {
    logger.error("Failed to get setup status", { error: error.message });
    res.status(500).json({ error: "Internal Server Error" });
  }
}
