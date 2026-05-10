import { logger } from '../utils/logger.js';
import { enqueueFlushForShift, processSyncQueue } from '../sync/syncManager.js';
import * as shiftRepo from '../storage/repositories/shift.repo.js';

/**
 * Manually enqueue a cloud sync job for a given shift.
 */
export async function manualSyncShift(req, res) {
  try {
    const { shift_id: shiftId } = req.body || {};

    if (!shiftId) {
      return res.status(400).json({ error: 'Missing required field: shift_id' });
    }

    const shift = shiftRepo.getShiftById(shiftId);
    if (!shift) {
      return res.status(404).json({ error: `Shift with ID ${shiftId} not found` });
    }

    const { enqueued, reason } = await enqueueFlushForShift(shiftId);
    // Trigger processing immediately but do not block response
    process.nextTick(processSyncQueue);

    return res.status(enqueued ? 202 : 200).json({ enqueued, reason });
  } catch (error) {
    logger.error('Failed to enqueue manual cloud sync', { error: error.message });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
