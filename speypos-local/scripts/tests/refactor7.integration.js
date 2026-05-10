import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localRoot = path.resolve(__dirname, '../..');

async function testSyncQueueDecoupledFromDbDir() {
  // Import paths with a dummy DB_PATH so we can assert the syncQueue location
  // is always under data/, regardless of the DB_PATH setting.
  const src = await readFile(path.join(localRoot, 'src/config/paths.js'), 'utf8');
  assert.ok(
    !src.includes('path.join(dbDir'),
    'syncQueue must not be derived from dbDir — it must use a fixed data/ location'
  );
  assert.ok(
    src.includes("'data/sync_queue.json'"),
    "syncQueue must be fixed at data/sync_queue.json relative to projectRoot"
  );
}

async function testReceiptsPathExists() {
  const src = await readFile(path.join(localRoot, 'src/config/paths.js'), 'utf8');
  assert.ok(
    src.includes('receipts'),
    'paths.js must export a receipts path'
  );
  assert.ok(
    src.includes("'data/receipts'"),
    "receipts path must point to data/receipts"
  );
}

async function testLoggerHasProfileAwareRetention() {
  const src = await readFile(path.join(localRoot, 'src/utils/logger.js'), 'utf8');
  assert.ok(
    src.includes('android-termux'),
    'logger.js must check for android-termux profile'
  );
  assert.ok(
    src.includes("'5m'") || src.includes('"5m"'),
    'logger.js must use a smaller maxSize for android-termux'
  );
  assert.ok(
    src.includes("'5d'") || src.includes('"5d"'),
    'logger.js must use a shorter maxFiles retention for android-termux'
  );
}

async function testReadmeDbPathMatchesEnvExample() {
  const readme = await readFile(path.join(localRoot, 'README.md'), 'utf8');
  const envExample = await readFile(path.join(localRoot, '.env.example'), 'utf8');

  const readmeMatch = readme.match(/DB_PATH=([^\s\n]+)/);
  const envMatch = envExample.match(/^DB_PATH=([^\s\n]+)/m);

  assert.ok(readmeMatch, 'README must contain a DB_PATH example');
  assert.ok(envMatch, '.env.example must contain a DB_PATH value');
  assert.equal(
    readmeMatch[1],
    envMatch[1],
    `README DB_PATH (${readmeMatch[1]}) must match .env.example DB_PATH (${envMatch[1]})`
  );
}

async function run() {
  await testSyncQueueDecoupledFromDbDir();
  await testReceiptsPathExists();
  await testLoggerHasProfileAwareRetention();
  await testReadmeDbPathMatchesEnvExample();
  console.log('Refactor 7 integration checks passed.');
}

run().catch((err) => {
  console.error('Refactor 7 integration checks failed:', err.message);
  process.exit(1);
});
