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
  syncQueue: path.join(dbDir, 'sync_queue.json'),
  receipts: path.join(projectRoot, 'data/receipts'),
  receiptTemplates: path.resolve(projectRoot, 'src/printer/templates'),
  receiptTemplate: path.resolve(projectRoot, 'src/printer/puppeteer/receipt.template.html'),
  voidReceiptTemplate: path.resolve(
    projectRoot,
    'src/printer/puppeteer/voided-receipt.template.html'
  ),
  logs: path.resolve(projectRoot, 'logs'),
  migrations: path.resolve(projectRoot, 'src/storage/migrations'),
  public: path.resolve(projectRoot, 'public'),
  seeds: path.resolve(projectRoot, 'data/seeds'),
  puppeteerCacheDir: path.join(projectRoot, 'data', 'puppeteer'),
  puppeteerChromeDir: path.join(projectRoot, 'data', 'puppeteer', 'chrome'),
};
