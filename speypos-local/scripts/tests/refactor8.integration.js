import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localRoot = path.resolve(__dirname, '../..');
const srcDir = path.join(localRoot, 'src');

async function readSrc(rel) {
  return readFile(path.join(srcDir, rel), 'utf8');
}

async function testEnvExportsTimeouts() {
  const envSrc = await readSrc('config/env.js');
  assert.ok(envSrc.includes('cloudFetchTimeoutMs'), 'env.js must export cloudFetchTimeoutMs');
  assert.ok(envSrc.includes('telegramFetchTimeoutMs'), 'env.js must export telegramFetchTimeoutMs');
  assert.ok(envSrc.includes('CLOUD_FETCH_TIMEOUT_MS'), 'env.js must read CLOUD_FETCH_TIMEOUT_MS');
  assert.ok(envSrc.includes('TELEGRAM_FETCH_TIMEOUT_MS'), 'env.js must read TELEGRAM_FETCH_TIMEOUT_MS');
}

async function testEnvExampleDocumentsTimeouts() {
  const example = await readFile(path.join(localRoot, '.env.example'), 'utf8');
  assert.ok(example.includes('CLOUD_FETCH_TIMEOUT_MS'), '.env.example must document CLOUD_FETCH_TIMEOUT_MS');
  assert.ok(example.includes('TELEGRAM_FETCH_TIMEOUT_MS'), '.env.example must document TELEGRAM_FETCH_TIMEOUT_MS');
}

async function testCloudHandshakeHasAbortController() {
  const code = await readSrc('services/cloudHandshake.service.js');
  assert.ok(code.includes('AbortController'), 'cloudHandshake.service.js must use AbortController');
  assert.ok(code.includes('AbortError'), 'cloudHandshake.service.js must handle AbortError');
  assert.ok(code.includes('clearTimeout'), 'cloudHandshake.service.js must clear the timeout');
}

async function testCloudIngestHasAbortController() {
  const code = await readSrc('services/cloudIngest.service.js');
  assert.ok(code.includes('AbortController'), 'cloudIngest.service.js must use AbortController');
  assert.ok(code.includes('AbortError'), 'cloudIngest.service.js must handle AbortError');
  assert.ok(code.includes('clearTimeout'), 'cloudIngest.service.js must clear the timeout');
}

async function testTelegramHasAbortController() {
  const code = await readSrc('services/telegram.service.js');
  assert.ok(code.includes('AbortController'), 'telegram.service.js must use AbortController');
  assert.ok(code.includes('AbortError'), 'telegram.service.js must handle AbortError');
  assert.ok(code.includes('clearTimeout'), 'telegram.service.js must clear the timeout');
}

async function testHealthCheckUsesCheapQuery() {
  const code = await readSrc('server/health.js');
  assert.ok(code.includes("SELECT 1"), 'health.js must use SELECT 1 as the liveness probe');
  // Match the actual pragma call, not the word in comments
  const hasPragmaCall =
    code.includes("pragma('integrity_check')") ||
    code.includes('pragma("integrity_check")');
  assert.equal(hasPragmaCall, false, "health.js must not call db.pragma('integrity_check')");
}

async function run() {
  await testEnvExportsTimeouts();
  await testEnvExampleDocumentsTimeouts();
  await testCloudHandshakeHasAbortController();
  await testCloudIngestHasAbortController();
  await testTelegramHasAbortController();
  await testHealthCheckUsesCheapQuery();
  console.log('Refactor 8 integration checks passed.');
}

run().catch((err) => {
  console.error('Refactor 8 integration checks failed:', err.message);
  process.exit(1);
});
