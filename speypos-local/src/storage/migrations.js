import { logger } from '../utils/logger.js';
import fs from 'fs';
import { paths } from '../config/paths.js';

// The directory containing migration files, resolved from the project root.
const MIGRATIONS_DIR = paths.migrations;

/**
 * Runs database migrations by executing SQL files from the migrations directory.
 * @param {import('better-sqlite3').Database} db The database instance.
 */
export function runMigrations(db) {
  logger.info('Running database migrations...');

  // 1. Create migrations table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  // 2. Get the highest applied version from the database
  const getLastVersion = db.prepare('SELECT MAX(version) as version FROM _migrations');
  const lastVersionResult = getLastVersion.get();
  const currentDbVersion = lastVersionResult?.version || 0;

  logger.info(`Current database version: ${currentDbVersion}`);

  // 3. Read all migration files from the directory
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    logger.info('Migrations directory not found. Skipping migrations.');
    return;
  }
  
  const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Sort alphabetically to ensure order

  // 4. Apply migrations that are newer than the current DB version
  for (const file of migrationFiles) {
    const versionMatch = file.match(/^(\d+)_/);
    if (!versionMatch) {
      logger.warn(`Skipping migration file with invalid name format: ${file}`);
      continue;
    }

    const version = parseInt(versionMatch[1], 10);

    if (version > currentDbVersion) {
      logger.info(`Applying migration version ${version} from ${file}...`);
      const sql = fs.readFileSync(`${MIGRATIONS_DIR}/${file}`, 'utf-8');
      
      try {
        db.exec(sql);
        const stmt = db.prepare('INSERT INTO _migrations (version, name, applied_at) VALUES (?, ?, ?)');
        stmt.run(version, file, new Date().toISOString());
        logger.info(`Migration version ${version} (${file}) applied.`);
      } catch (error) {
        logger.error(`Failed to apply migration ${file}:`, error);
        // Depending on the desired behavior, you might want to re-throw the error
        // to stop the application from starting with a partially migrated database.
        throw error;
      }
    }
  }

  logger.info('Migrations are up to date.');
}