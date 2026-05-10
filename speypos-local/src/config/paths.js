import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root of the entire project
const projectRoot = path.resolve(__dirname, '../..');

// Resolve the database path relative to the project root
const dbPath = path.resolve(projectRoot, env.dbPath);
const dbDir = path.dirname(dbPath);

export const paths = {
  projectRoot,
  db: {
    path: dbPath,
    directory: dbDir,
  },
  images: {
    base: path.join(projectRoot, 'data/images'),
    menu: path.join(projectRoot, 'data/images/menu'),
    category: path.join(projectRoot, 'data/images/category'),
    staff: path.join(projectRoot, 'data/images/staff'),
  },
  // Fixed at data/ regardless of DB_PATH so the queue location is predictable.
  syncQueue: path.join(projectRoot, 'data/sync_queue.json'),
  receipts: path.join(projectRoot, 'data/receipts'),
  logs: path.resolve(projectRoot, 'logs'),
  migrations: path.resolve(projectRoot, 'src/storage/migrations'),
  public: path.resolve(projectRoot, 'public'),
  seeds: path.resolve(projectRoot, 'data/seeds'),
};
