import winston from 'winston';
import 'winston-daily-rotate-file';
import fs from 'fs';
import { env } from '../config/env.js';
import { paths } from '../config/paths.js';

// Ensure the log directory exists
if (!fs.existsSync(paths.logs)) {
  fs.mkdirSync(paths.logs, { recursive: true });
}

const { combine, timestamp, printf, colorize, json } = winston.format;

// Define the format for console logging in development
const devFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message} `;
    if (Object.keys(metadata).length > 0) {
      msg += JSON.stringify(metadata, null, 2);
    }
    return msg;
  })
);

// Define the format for file logging in production
const prodFormat = combine(
  timestamp(),
  json()
);

// Create the logger instance
const logger = winston.createLogger({
  level: env.isDevelopment ? 'debug' : 'info',
  format: env.isDevelopment ? devFormat : prodFormat,
});

if (env.isDevelopment) {
  // In development, log to the console
  logger.add(new winston.transports.Console());
} else {
  // In production, log to rotating files.
  // Use smaller limits on Android to avoid exhausting limited phone storage.
  const isAndroid = env.runtimeProfile === 'android-termux';
  logger.add(new winston.transports.DailyRotateFile({
    filename: 'production-%DATE%.log',
    dirname: paths.logs,
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: isAndroid ? '5m' : '20m',
    maxFiles: isAndroid ? '5d' : '14d',
  }));
  // Also add a console logger in production, but with the JSON format
  logger.add(new winston.transports.Console({
    format: prodFormat,
  }));
}

export { logger };