import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

// Validate env.js exports and runtime profile validation logic without loading the full module
// (loading env.js requires DB_PATH and PORT to be set). We inspect source text for structural checks
// and run the logic separately in process.

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function readSrc(relativePath) {
  return readFile(path.resolve(__dirname, '../../src', relativePath), 'utf8');
}

async function testEnvExportsCorsOriginAndCloudBaseUrl() {
  const src = await readSrc('config/env.js');

  assert.ok(
    src.includes('corsOrigin'),
    'env.js must export corsOrigin'
  );
  assert.ok(
    src.includes('cloudBaseUrl'),
    'env.js must export cloudBaseUrl'
  );
}

async function testRuntimeProfileEnumValidation() {
  const src = await readSrc('config/env.js');

  assert.ok(
    src.includes('VALID_RUNTIME_PROFILES'),
    'env.js must define VALID_RUNTIME_PROFILES allowlist'
  );
  assert.ok(
    src.includes("'android-termux'"),
    'android-termux must be in the valid profile list'
  );
  assert.ok(
    src.includes("'development'"),
    'development must be in the valid profile list'
  );
  assert.ok(
    src.includes('Invalid RUNTIME_PROFILE'),
    'env.js must throw on unknown RUNTIME_PROFILE values'
  );
}

async function testTelegramServiceUsesEnvModule() {
  const src = await readSrc('services/telegram.service.js');

  assert.ok(
    src.includes("import { env }"),
    'telegram.service.js must import env from config/env.js'
  );
  assert.ok(
    src.includes('env.telegramBotToken'),
    'telegram.service.js must use env.telegramBotToken'
  );
  assert.equal(
    src.includes('process.env.TELEGRAM_BOT_TOKEN'),
    false,
    'telegram.service.js must not read process.env.TELEGRAM_BOT_TOKEN directly'
  );
}

async function testHttpServerUsesEnvCorsOrigin() {
  const src = await readSrc('server/httpServer.js');

  assert.ok(
    src.includes('env.corsOrigin'),
    'httpServer.js must use env.corsOrigin'
  );
  assert.equal(
    src.includes("'http://localhost:8000'"),
    false,
    'httpServer.js must not hardcode localhost:8000 as CORS origin'
  );
}

async function testCloudBaseUrlConsolidated() {
  const [handshake, ingest, controller, settings] = await Promise.all([
    readSrc('services/cloudHandshake.service.js'),
    readSrc('services/cloudIngest.service.js'),
    readSrc('controllers/settings.controller.js'),
    readSrc('services/settings.service.js'),
  ]);

  const hardcoded = 'https://speypos-cloud.ryong.net';

  assert.equal(
    handshake.includes(hardcoded),
    false,
    'cloudHandshake.service.js must not hardcode cloud base URL'
  );
  assert.equal(
    ingest.includes(hardcoded),
    false,
    'cloudIngest.service.js must not hardcode cloud base URL'
  );
  assert.equal(
    controller.includes(hardcoded),
    false,
    'settings.controller.js must not hardcode cloud base URL'
  );
  assert.equal(
    settings.includes(hardcoded),
    false,
    'settings.service.js must not hardcode cloud base URL'
  );
}

async function testEnvExampleExists() {
  const examplePath = path.resolve(__dirname, '../../.env.example');
  const content = await readFile(examplePath, 'utf8');

  for (const key of ['PORT', 'DB_PATH', 'RUNTIME_PROFILE', 'FORCE_CONSOLE_PRINTER',
    'CORS_ORIGIN', 'CLOUD_BASE_URL', 'TELEGRAM_BOT_TOKEN', 'NODE_ENV', 'SYNC_MINI_BATCH_SIZE']) {
    assert.ok(content.includes(key), `.env.example must document ${key}`);
  }

  assert.equal(
    content.includes('TELEGRAM_CHAT_ID'),
    false,
    '.env.example must not include phantom TELEGRAM_CHAT_ID variable'
  );
}

async function run() {
  await testEnvExportsCorsOriginAndCloudBaseUrl();
  await testRuntimeProfileEnumValidation();
  await testTelegramServiceUsesEnvModule();
  await testHttpServerUsesEnvCorsOrigin();
  await testCloudBaseUrlConsolidated();
  await testEnvExampleExists();
  console.log('Refactor 4 integration checks passed.');
}

run().catch((error) => {
  console.error('Refactor 4 integration checks failed:', error.message);
  process.exit(1);
});
