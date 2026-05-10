import { randomUUID } from 'crypto';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { readQueue, writeQueue } from './queue.js';
import * as orderRepo from '../storage/repositories/order.repo.js';
import * as shiftRepo from '../storage/repositories/shift.repo.js';
import { serializeOrder } from '../serializers/order.serializer.js';
import { uploadOrdersBatch } from '../services/cloudIngest.service.js';

const JOB_TYPES = {
  ORDERS_SHIFT_MINI_BATCH: 'orders_shift_mini_batch',
  ORDERS_SHIFT_FLUSH: 'orders_shift_flush',
};

let isProcessing = false;

async function enqueueShiftJob(shiftId, type) {
  const queue = await readQueue();

  const alreadyQueued = queue.some((job) => job.type === type && job.shiftId === shiftId);
  if (alreadyQueued) {
    return { enqueued: false, reason: 'duplicate' };
  }

  queue.push({
    id: randomUUID(),
    type,
    shiftId,
    created_at: new Date().toISOString(),
    last_attempt_at: null,
    retry_count: 0,
  });

  await writeQueue(queue);
  process.nextTick(processSyncQueue);
  return { enqueued: true };
}

/**
 * Backward-compatible wrapper for manual/legacy callers. Flushes the whole shift.
 * @param {string} shiftId
 */
export async function enqueueOrdersForShift(shiftId) {
  return enqueueFlushForShift(shiftId);
}

/**
 * Enqueues a mini-batch sync for the currently active shift only when threshold is reached.
 */
export async function maybeEnqueueMiniBatchForActiveShift() {
  const activeShift = shiftRepo.getActiveShiftForNow();
  if (!activeShift) {
    return { enqueued: false, reason: 'no_active_shift' };
  }

  const unsyncedCount = orderRepo.countFinalizedUnsyncedByShift(activeShift.id);
  if (unsyncedCount < env.syncMiniBatchSize) {
    return { enqueued: false, reason: 'below_threshold' };
  }

  const result = await enqueueShiftJob(activeShift.id, JOB_TYPES.ORDERS_SHIFT_MINI_BATCH);
  if (result.enqueued) {
    logger.info(`Queued mini-batch cloud sync for active shift ${activeShift.id}.`, {
      batchSize: env.syncMiniBatchSize,
      unsyncedCount,
    });
  }

  return result;
}

/**
 * Enqueues a full flush for a shift. Intended for shift close/manual operations.
 * @param {string} shiftId
 */
export async function enqueueFlushForShift(shiftId) {
  const result = await enqueueShiftJob(shiftId, JOB_TYPES.ORDERS_SHIFT_FLUSH);
  if (result.enqueued) {
    logger.info(`Queued cloud sync flush job for shift ${shiftId}.`, {
      batchSize: env.syncMiniBatchSize,
    });
  }
  return result;
}

/**
 * Processes the sync queue sequentially with simple backoff on failures.
 */
export async function processSyncQueue() {
  if (isProcessing) {
    return;
  }

  isProcessing = true;

  try {
    let queue = await readQueue();

    if (queue.length === 0) {
      return;
    }

    while (queue.length > 0) {
      const job = queue[0];
      const result = await processJob(job);

      if (result.success) {
        queue.shift();
        await writeQueue(queue);
        if (queue.length === 0) {
          break;
        }
        continue;
      }

      queue[0] = {
        ...job,
        retry_count: (job.retry_count || 0) + 1,
        last_attempt_at: new Date().toISOString(),
      };
      await writeQueue(queue);
      break;
    }
  } catch (error) {
    logger.error('Unexpected error while processing sync queue.', { error: error.message });
  } finally {
    isProcessing = false;
  }
}

async function processJob(job) {
  switch (job.type) {
    case JOB_TYPES.ORDERS_SHIFT_MINI_BATCH:
      return handleMiniBatchJob(job);
    case JOB_TYPES.ORDERS_SHIFT_FLUSH:
      return handleFlushJob(job);
    default:
      logger.warn(`Unknown sync job type: ${job.type}. Dropping.`);
      return { success: true };
  }
}

async function handleMiniBatchJob(job) {
  const activeShift = shiftRepo.getActiveShiftForNow();
  if (!activeShift || activeShift.id !== job.shiftId) {
    logger.info(`Skipping mini-batch job for shift ${job.shiftId}: shift is not active.`);
    return { success: true, skipped: true };
  }

  const shift = shiftRepo.getShiftById(job.shiftId);
  if (!shift) {
    logger.warn(`Shift ${job.shiftId} not found; dropping mini-batch cloud sync job.`);
    return { success: true, skipped: true };
  }

  const orders = orderRepo.getFinalizedUnsyncedByShift(job.shiftId, {
    limit: env.syncMiniBatchSize,
  });
  if (!orders.length) {
    return { success: true, skipped: true };
  }

  const serializedOrders = orders.map((order) => serializeOrder(order)).filter(Boolean);
  const result = await uploadOrdersBatch({ shift, orders: serializedOrders, source: 'manual' });

  if (result.success) {
    orderRepo.markOrdersSynced(serializedOrders.map((o) => o.id));
  }

  return { success: !!result.success };
}

async function handleFlushJob(job) {
  const shift = shiftRepo.getShiftById(job.shiftId);
  if (!shift) {
    logger.warn(`Shift ${job.shiftId} not found; dropping flush cloud sync job.`);
    return { success: true, skipped: true };
  }

  if (!shiftRepo.isShiftClosed(job.shiftId)) {
    logger.warn(`Skipping flush sync for shift ${job.shiftId}: shift is not closed.`);
    return { success: true, skipped: true };
  }

  while (true) {
    const orders = orderRepo.getFinalizedUnsyncedByShift(job.shiftId, {
      limit: env.syncMiniBatchSize,
    });

    if (!orders.length) {
      return { success: true, skipped: true };
    }

    const serializedOrders = orders.map((order) => serializeOrder(order)).filter(Boolean);
    const result = await uploadOrdersBatch({
      shift,
      orders: serializedOrders,
      source: 'shift_close',
    });

    if (!result.success) {
      return { success: false };
    }

    orderRepo.markOrdersSynced(serializedOrders.map((o) => o.id));
  }
}
