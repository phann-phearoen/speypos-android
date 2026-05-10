import Database from 'better-sqlite3';
import { paths } from '../../src/config/paths.js';
import { SEEDABLE_TABLES } from './config.js';
import fs from 'fs';

function getArg(argName) {
  const arg = process.argv.find(a => a.startsWith(`${argName}=`));
  if (!arg) return null;
  return arg.split('=')[1];
}

function main() {
  const inFile = getArg('--in');
  const mode = getArg('--mode');

  if (!inFile) {
    console.error('❌ Error: Please provide an input file name using --in=<filename>.sql');
    process.exit(1);
  }

  const dbPath = paths.db.path;
  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Error: Database not found at ${dbPath}. Please run the application first to create it.`);
    process.exit(1);
  }

  const seedsDir = paths.seeds;
  const inPath = `${seedsDir}/${inFile}`;

  if (!fs.existsSync(inPath)) {
    console.error(`❌ Error: Input file not found at ${inPath}`);
    process.exit(1);
  }

  console.log(`Seeding database at ${dbPath} from ${inPath}...`);

  let db;
  try {
    db = new Database(dbPath);
    const seedSql = fs.readFileSync(inPath, 'utf-8');
    const quote = (str) => `"${str}"`;

    if (mode === 'full') {
      // Foreign key checks must be disabled to allow arbitrary table clearing order.
      db.exec('PRAGMA foreign_keys = OFF;');
    }

    // Use a transaction for atomicity. It will automatically roll back on error.
    const seedTransaction = db.transaction(() => {
      let tablesToClear;
      if (mode === 'full') {
        console.log('Clearing old data from all tables...');
        tablesToClear = db
          .prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
          )
          .all()
          .map((row) => row.name);
      } else {
        console.log('Clearing old data from seedable tables...');
        // Reverse to respect foreign key constraints on deletion
        tablesToClear = SEEDABLE_TABLES.slice().reverse();
      }

      for (const table of tablesToClear) {
        db.prepare(`DELETE FROM ${quote(table)}`).run();
      }

      console.log('Inserting new data...');
      db.exec(seedSql);
    });

    seedTransaction();

    console.log('✅ Successfully seeded database.');
    console.log('🚀 You may now start the application.');
  } catch (error) {
    console.error(`❌ Error during database seed: ${error.message}`);
    process.exit(1);
  } finally {
    // Ensure foreign keys are re-enabled and the connection is closed.
    if (mode === 'full' && db) {
      db.exec('PRAGMA foreign_keys = ON;');
    }
    if (db && db.open) {
      db.close();
    }
  }
}

main();
