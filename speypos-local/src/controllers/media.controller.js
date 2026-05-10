import fs from 'fs/promises';
import { paths } from '../config/paths.js';
import { logger } from '../utils/logger.js';

const UPLOAD_TYPES = ['menu', 'category', 'staff'];

/**
 * Handles the request to delete an image file.
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 */
async function deleteImage(req, res) {
  try {
    const { type, filename } = req.params;

    // 1. Validate parameters to prevent path traversal attacks
    if (!UPLOAD_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Invalid media type.' });
    }
    // A simple but effective way to prevent traversal: ensure filename is just a filename.
    if (filename.includes('/') || filename.includes('..')) {
        return res.status(400).json({ error: 'Invalid filename.' });
    }

    // 2. Construct the full path and delete the file
    const filePath = `${paths.images[type]}/${filename}`;

    await fs.unlink(filePath);
    logger.info(`Successfully deleted file: ${filePath}`);
    res.status(204).send();

  } catch (error) {
    if (error.code === 'ENOENT') {
      // File not found is not a server error in a DELETE request
      logger.warn(`Attempted to delete non-existent file: ${req.params.filename}`);
      return res.status(404).json({ error: 'File not found.' });
    }
    logger.error('Failed to delete image', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export const MediaController = {
  deleteImage,
};
