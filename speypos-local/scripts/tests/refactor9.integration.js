import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localRoot = path.resolve(__dirname, '../..');

async function readLocal(rel) {
  return readFile(path.join(localRoot, rel), 'utf8');
}

async function testRuntimeStatusModuleExists() {
  const code = await readLocal('src/system/runtimeStatus.js');
  assert.ok(code.includes('setStartupPhase'), 'runtimeStatus.js must export setStartupPhase');
  assert.ok(code.includes('setRecoveryRunning'), 'runtimeStatus.js must export setRecoveryRunning');
  assert.ok(code.includes('setDegradedReasons'), 'runtimeStatus.js must export setDegradedReasons');
  assert.ok(code.includes('getRuntimeStatus'), 'runtimeStatus.js must export getRuntimeStatus');
}

async function testStartupRecoveryIncludesTelegram() {
  const code = await readLocal('src/system/watchdog.js');
  assert.ok(
    code.includes('retryUnprintedOrders') && code.includes('retryUnreportedTelegrams'),
    'watchdog startup recovery must run both print and telegram retries'
  );
}

async function testPendingActionsExposeDegradedSignals() {
  const code = await readLocal('src/controllers/system.controller.js');
  assert.ok(code.includes('healthState'), 'pending-actions response must include healthState');
  assert.ok(code.includes('degradedReasons'), 'pending-actions response must include degradedReasons');
  assert.ok(code.includes('isDegraded'), 'pending-actions response must include isDegraded');
  assert.ok(code.includes('getRuntimeStatusSnapshot'), 'system controller must expose runtime status handler');
}

async function testRuntimeStatusRouteExists() {
  const code = await readLocal('src/routes/system.routes.js');
  assert.ok(
    code.includes("/system/runtime-status"),
    'system routes must expose /system/runtime-status endpoint'
  );
}

async function testRequestIdMiddlewareExists() {
  const code = await readLocal('src/server/httpServer.js');
  assert.ok(code.includes('x-request-id'), 'httpServer must set x-request-id header');
  assert.ok(code.includes('randomUUID'), 'httpServer must generate request IDs');
  assert.ok(code.includes("event: 'http.request'"), 'httpServer must emit structured request log events');
}

async function run() {
  await testRuntimeStatusModuleExists();
  await testStartupRecoveryIncludesTelegram();
  await testPendingActionsExposeDegradedSignals();
  await testRuntimeStatusRouteExists();
  await testRequestIdMiddlewareExists();
  console.log('Refactor 9 integration checks passed.');
}

run().catch((err) => {
  console.error('Refactor 9 integration checks failed:', err.message);
  process.exit(1);
});
