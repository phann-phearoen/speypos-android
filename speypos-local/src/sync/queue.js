import fs from 'fs/promises';
import { paths } from '../config/paths.js';
import { logger } from '../utils/logger.js';

const queuePath = paths.syncQueue;

/**
 * Reads the sync queue from the filesystem.
 * @returns {Promise<Array>} The current queue.
 */
export async function readQueue() {
  try {
    await fs.access(queuePath);
    const data = await fs.readFile(queuePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If the file doesn't exist, return an empty queue
    if (error.code === 'ENOENT') {
      return [];
    }
    logger.error('Failed to read sync queue.', { error: error.message });
    // If we can't read the file for other reasons, it's a critical error.
    // For now, we return an empty array to avoid crashing, but this needs monitoring.
    return [];
  }
}

/**
 * Writes the sync queue to the filesystem.
 * @param {Array} queue - The queue to write.
 */
export async function writeQueue(queue) {
  try {
    await fs.writeFile(queuePath, JSON.stringify(queue, null, 2));
  } catch (error) {
    logger.error('Failed to write sync queue.', { error: error.message });
    // This is a critical failure, as we might lose sync data.
    // A real system might need a fallback or alert here.
  }
}
