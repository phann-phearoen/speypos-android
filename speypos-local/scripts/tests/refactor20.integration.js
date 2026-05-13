import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

async function readRepoFile(relativePath) {
  return readFile(path.join(repoRoot, relativePath), 'utf8');
}

async function testReadinessRouteAndHandlerWiring() {
  const routes = await readRepoFile('speypos-local/src/routes/system.routes.js');
  const controller = await readRepoFile('speypos-local/src/controllers/system.controller.js');

  assert.ok(
    routes.includes("router.get('/system/readiness', systemController.getReadinessStatus);"),
    'System routes must expose readiness endpoint'
  );
  assert.ok(
    controller.includes('export async function getReadinessStatus(req, res) {'),
    'System controller must expose getReadinessStatus handler'
  );
}

async function testReadinessStatusCodeAndStateContract() {
  const controller = await readRepoFile('speypos-local/src/controllers/system.controller.js');

  assert.ok(
    controller.includes('const ready = blockingReasons.length === 0;'),
    'Readiness handler must derive ready state from blocking reasons'
  );
  assert.ok(
    controller.includes('res.status(ready ? 200 : 503).json({'),
    'Readiness handler must return 200 when ready and 503 when not ready'
  );
  assert.ok(
    controller.includes("status: ready ? 'ready' : 'not_ready',"),
    'Readiness response must include status discriminator'
  );
  assert.ok(
    controller.includes('ready,'),
    'Readiness response must include ready boolean field'
  );
  assert.ok(
    controller.includes('blockingReasons,'),
    'Readiness response must include blockingReasons list'
  );
}

async function testReadinessBlockingReasonRules() {
  const controller = await readRepoFile('speypos-local/src/controllers/system.controller.js');

  assert.ok(
    controller.includes("blockingReasons.push(`startup_phase_${runtime.startupPhase}`);"),
    'Readiness must block when startup phase is not ready'
  );
  assert.ok(
    controller.includes("blockingReasons.push('recovery_running');"),
    'Readiness must block when recovery is running'
  );
  assert.ok(
    controller.includes("blockingReasons.push('sync_queue_unavailable');"),
    'Readiness must block when sync queue is unavailable'
  );
}

async function testReadinessSyncQueueSummaryContract() {
  const controller = await readRepoFile('speypos-local/src/controllers/system.controller.js');

  assert.ok(
    controller.includes('const queueSummary = queue.reduce('),
    'Readiness must compute queue summary from queue records'
  );
  assert.ok(
    controller.includes('totalJobs: queue.length,'),
    'Readiness syncQueue must include totalJobs'
  );
  assert.ok(
    controller.includes('readyJobs: 0,'),
    'Readiness syncQueue must include readyJobs'
  );
  assert.ok(
    controller.includes('delayedJobs: 0,'),
    'Readiness syncQueue must include delayedJobs'
  );
  assert.ok(
    controller.includes('maxRetryCount: 0,'),
    'Readiness syncQueue must include maxRetryCount'
  );
  assert.ok(
    controller.includes('oldestJobCreatedAt: null,'),
    'Readiness syncQueue must include oldestJobCreatedAt'
  );
  assert.ok(
    controller.includes('nextAttemptAt: null,'),
    'Readiness syncQueue must include nextAttemptAt'
  );
  assert.ok(
    controller.includes('queueAccessible: !queueError,'),
    'Readiness syncQueue must include queueAccessible flag'
  );
  assert.ok(
    controller.includes('error: queueError?.message || null,'),
    'Readiness syncQueue must include queue error field'
  );
}

async function run() {
  await testReadinessRouteAndHandlerWiring();
  await testReadinessStatusCodeAndStateContract();
  await testReadinessBlockingReasonRules();
  await testReadinessSyncQueueSummaryContract();
  console.log('Refactor 20 integration checks passed.');
}

run().catch((err) => {
  console.error('Refactor 20 integration checks failed:', err.message);
  process.exit(1);
});