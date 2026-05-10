import multer from 'multer';
import fs from 'fs';
import { randomBytes } from 'crypto';
import { paths } from '../config/paths.js';
import { logger } from '../utils/logger.js';

const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp'];
const UPLOAD_TYPES = ['menu', 'category', 'staff'];

// 1. Configure file filter
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, and WebP are allowed.'), false);
  }
};

// 2. Configure storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.params.type;
    if (!UPLOAD_TYPES.includes(type)) {
      return cb(new Error('Invalid upload type specified in URL.'), null);
    }

    const uploadPath = paths.images[type];
    
    // Create directory if it doesn't exist
    fs.mkdirSync(uploadPath, { recursive: true });
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomString = randomBytes(8).toString('hex');
    const extension = file.originalname.slice(file.originalname.lastIndexOf('.'));
    const filename = `${timestamp}-${randomString}${extension}`;
    cb(null, filename);
  },
});

// 3. Create multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB limit
  },
});

// 4. Controller function to handle the final response
const handleUpload = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  // Construct the relative URL for the client
  const relativeUrl = `/media/${req.params.type}/${req.file.filename}`;

  logger.info(`File uploaded successfully: ${req.file.filename} to type ${req.params.type}`);
  res.status(201).json({
    message: 'File uploaded successfully.',
    url: relativeUrl,
    filename: req.file.filename,
  });
};

// Middleware to handle multer errors gracefully
const handleUploadErrors = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // A Multer error occurred (e.g., file too large)
        return res.status(400).json({ error: err.message });
    } else if (err) {
        // An unknown error occurred (e.g., invalid file type)
        return res.status(400).json({ error: err.message });
    }
    next();
};


export const UploadController = {
  uploadMiddleware: upload.single('image'),
  handleUpload,
  handleUploadErrors,
};
