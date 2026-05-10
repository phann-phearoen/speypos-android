import Database from 'better-sqlite3';
import fs from 'fs';
import { paths } from '../config/paths.js';
import { logger } from '../utils/logger.js';
import { runMigrations } from './migrations.js';

let db;

/**
 * Initializes the SQLite database connection.
 * Creates the database file and directory if they don't exist.
 */
export function initializeDatabase() {
  // Ensure the database directory exists
  fs.mkdirSync(paths.db.directory, { recursive: true });

  logger.info(`Initializing database at: ${paths.db.path}`);
  db = new Database(paths.db.path, {
    // verbose: console.log, // Uncomment for debugging SQL queries
    fileMustExist: false,
  });

  // Enable WAL (Write-Ahead Logging) mode for better concurrency and crash-resistance.
  // This is critical for POS-grade reliability.
  db.pragma('journal_mode = WAL');

  // Run database migrations
  runMigrations(db);

  logger.info('Database initialized successfully.');
}

/**
 * Returns the active database instance.
 * @returns {Database.Database} The database instance.
 */
export function getDb() {
  if (!db) {
    throw new Error('Database has not been initialized. Call initializeDatabase() first.');
  }
  return db;
}

/**
 * Closes the database connection.
 */
export function closeDatabase() {
  if (db) {
    db.close();
    logger.info('Database connection closed.');
    db = null;
  }
}
