import * as shiftRepo from '../storage/repositories/shift.repo.js';
import { logger } from '../utils/logger.js';
import { randomUUID } from 'crypto';
import { serializeManyShifts, serializeShift } from '../serializers/shift.serializer.js';
import { sendShiftCloseNotification } from '../services/telegram.service.js';
import * as recoveryService from '../services/recovery.service.js';
import * as shiftService from '../services/shift.service.js';
import { enqueueFlushForShift } from '../sync/syncManager.js';

/**
 * Handles the request to get all shifts.
 */
export function getShifts(req, res) {
  try {
    const { date, status } = req.query;
    const filters = {};
    if (date) {
      filters.date = date;
    }
    if (status) {
      filters.status = status;
    }

    const items = shiftRepo.getAllShifts(filters);
    res.status(200).json(serializeManyShifts(items));
  } catch (error) {
    logger.error('Failed to get shifts', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export function getOpenShifts(req, res) {
  try {
    const filter = { status: 'open' };
    const items = shiftRepo.getAllShifts(filter);
    if (items.length > 0) {
      res.status(200).json(serializeManyShifts(items));
    } else {
      res.status(404).json({ error: 'No open shifts found' });
    }
  } catch (error) {
    logger.error('Failed to get open shifts', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to get a single shift by its ID.
 */
export function getShift(req, res) {
  try {
    const { id } = req.params;
    const item = shiftRepo.getShiftById(id);
    if (item) {
      res.status(200).json(serializeShift(item));
    } else {
      res.status(404).json({ error: `Shift with ID ${id} not found` });
    }
  } catch (error) {
    logger.error('Failed to get shift', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to create a new shift.
 * A shift is typically started with a status of 'open'.
 */
export function createShift(req, res) {
  try {
    const { status = 'open', date } = req.body;
    if (!date) {
      return res.status(400).json({ error: 'Missing required field: date' });
    }

    const newShiftData = {
      id: randomUUID(),
      status,
      started_at: Date.now(),
      ended_at: null,
      date,
    };

    const createdItem = shiftRepo.createShift(newShiftData);
    res.status(201).json(serializeShift(createdItem));
  } catch (error) {
    logger.error('Failed to create shift', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to update an existing shift.
 * Commonly used to end a shift by setting its status and ended_at time.
 */
export async function updateShift(req, res) {
  try {
    const { id } = req.params;
    const item = shiftRepo.getShiftById(id);
    if (!item) {
      return res.status(404).json({ error: `Shift with ID ${id} not found` });
    }

    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'Request body cannot be empty for a PATCH request' });
    }

    const updateData = { ...req.body };
    const isClosingShift = updateData.status === 'closed';

    const { utcDate } = getNowInStoreTime();

    if (isClosingShift && !updateData.ended_at) {
      updateData.ended_at = utcDate.getTime();
    }

    const updatedItem = shiftRepo.updateShift(id, updateData);

    // If the shift was closed, generate and send the report.
    if (isClosingShift) {
      const shiftReport = shiftRepo.getShiftSalesReport(id);
      if (shiftReport) {
        // Ensure the ended_at time is the one we just set
        shiftReport.shift.ended_at = updatedItem.ended_at;

        // Await the initial notification to ensure it finishes before we retry others
        await sendShiftCloseNotification(shiftReport).catch((err) => {
          logger.warn(
            `Initial Telegram notification failed for shift ${shiftReport.shift.id}. It will be retried later.`,
            { error: err.message }
          );
        });

        // Now that the initial attempt is done, trigger a retry pass for any OTHER pending jobs.
        recoveryService.retryUnreportedTelegrams();

        // Queue cloud sync flush for this closed shift in the background.
        enqueueFlushForShift(id).catch((err) => {
          logger.warn(`Failed to enqueue cloud sync flush for shift ${id}`, { error: err.message });
        });
      }
    }

    res.status(200).json(serializeShift(updatedItem));
  } catch (error) {
    logger.error('Failed to update shift', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to delete a shift.
 */
export function deleteShift(req, res) {
  try {
    const { id } = req.params;
    const result = shiftRepo.deleteShift(id);
    if (result.changes > 0) {
      res.status(204).send(); // No Content
    } else {
      res.status(404).json({ error: `Shift with ID ${id} not found` });
    }
  } catch (error) {
    logger.error('Failed to delete shift', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to open a new shift and assign a staff member.
 */
import { getNowInStoreTime } from '../services/time.service.js';

export function openShift(req, res) {
  try {
    const { staff_id } = req.body;
    if (!staff_id) {
      return res.status(400).json({ error: 'Missing required field: staff_id' });
    }

    const allOpenShifts = shiftRepo.getAllShifts({ status: 'open' });
    const { todayStoreDate, utcDate } = getNowInStoreTime();

    for (const shift of allOpenShifts) {
      if (shift.date !== todayStoreDate) {
        logger.warn(
          `AUTO_CLOSING_ORPHAN_SHIFT: Found and closing orphan shift ${shift.id} from store date ${shift.date}.`
        );
        shiftRepo.updateShift(shift.id, { status: 'closed', ended_at: utcDate.getTime() });
      } else {
        logger.error(
          `OPEN_SHIFT_EXISTS: Attempt to open a new shift for store date ${todayStoreDate} when one already exists.`
        );
        return res.status(409).json({
          error: 'OPEN_SHIFT_EXISTS',
          message: 'An open shift for the current day already exists.',
        });
      }
    }

    // If we've reached this point, all orphans are closed and no shift for today exists.
    const newShift = shiftRepo.openShiftForStaff(staff_id);
    res.status(201).json(serializeShift(newShift));
  } catch (error) {
    logger.error('Failed to open shift', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to get data for the day-close review screen.
 */
export async function getDayCloseReview(req, res) {
  try {
    const reviewData = await shiftService.getReviewDataForDayClose();
    res.status(200).json(reviewData);
  } catch (error) {
    logger.error('Failed to get day close review data', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to generate a day-close report.
 */
export async function closeDay(req, res) {
  try {
    const report = await shiftService.generateDayCloseReport();
    res.status(200).json(report);
  } catch (error) {
    logger.error('Failed to generate day close report', {
      error: error.message,
      stack: error.stack,
    });
    // Check for a specific error message from the service to return a client-friendly error
    if (error.message.includes('requires exactly 2 closed shifts')) {
      return res.status(409).json({ error: 'DAY_NOT_READY', message: error.message });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
