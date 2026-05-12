import fs from 'fs/promises';
import path from 'path';
import { paths } from '../config/paths.js';
import { logger } from '../utils/logger.js';
import { getRuntimeStatus, setDegradedReasons } from '../system/runtimeStatus.js';

const queuePath = paths.syncQueue;
const queueDir = path.dirname(queuePath);
const QUEUE_DEGRADED_REASONS = [
  'sync_queue_read_failed',
  'sync_queue_parse_failed',
  'sync_queue_write_failed',
];

function setQueueReason(reason) {
  const runtime = getRuntimeStatus();
  const nextReasons = [
    ...runtime.degradedReasons.filter((value) => !QUEUE_DEGRADED_REASONS.includes(value)),
    reason,
  ];
  setDegradedReasons(nextReasons, 'sync_queue');
}

function clearQueueReasons() {
  const runtime = getRuntimeStatus();
  const nextReasons = runtime.degradedReasons.filter(
    (value) => !QUEUE_DEGRADED_REASONS.includes(value)
  );
  setDegradedReasons(nextReasons, 'sync_queue');
}

/**
 * Reads the sync queue from the filesystem.
 * @returns {Promise<Array>} The current queue.
 */
export async function readQueue() {
  try {
    await fs.access(queuePath);
    const data = await fs.readFile(queuePath, 'utf-8');
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) {
      throw new Error('Sync queue file is not an array.');
    }

    clearQueueReasons();
    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }

    if (error?.name === 'SyntaxError') {
      const badPath = `${queuePath}.bad.${Date.now()}`;
      try {
        await fs.copyFile(queuePath, badPath);
      } catch (copyError) {
        logger.warn('Failed to snapshot corrupted sync queue file.', {
          error: copyError.message,
          path: badPath,
        });
      }

      setQueueReason('sync_queue_parse_failed');
      logger.error('Sync queue is corrupted and could not be parsed.', {
        error: error.message,
        path: queuePath,
        snapshotPath: badPath,
      });
      throw error;
    }

    setQueueReason('sync_queue_read_failed');
    logger.error('Failed to read sync queue.', { error: error.message, path: queuePath });
    throw error;
  }
}

/**
 * Writes the sync queue to the filesystem.
 * @param {Array} queue - The queue to write.
 */
export async function writeQueue(queue) {
  let tmpPath;
  try {
    await fs.mkdir(queueDir, { recursive: true });
    tmpPath = `${queuePath}.tmp-${process.pid}-${Date.now()}`;
    const payload = `${JSON.stringify(queue, null, 2)}\n`;
    const handle = await fs.open(tmpPath, 'w');

    try {
      await handle.writeFile(payload, 'utf-8');
      await handle.sync();
    } finally {
      await handle.close();
    }

    await fs.rename(tmpPath, queuePath);
    clearQueueReasons();
  } catch (error) {
    if (tmpPath) {
      await fs.rm(tmpPath, { force: true }).catch(() => {});
    }

    setQueueReason('sync_queue_write_failed');
    logger.error('Failed to write sync queue.', { error: error.message, path: queuePath });
    throw error;
  }
}
