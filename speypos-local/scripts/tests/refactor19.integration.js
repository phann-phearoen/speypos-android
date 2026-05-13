import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

async function readRepoFile(relativePath) {
  return readFile(path.join(repoRoot, relativePath), 'utf8');
}

async function testPendingActionsResponseIncludesOperationalSignals() {
  const source = await readRepoFile('speypos-local/src/controllers/system.controller.js');

  assert.ok(
    source.includes('const printerPending = recoveryService.getPrinterPendingMetrics();'),
    'Pending-actions controller must include printer pending metrics aggregation'
  );
  assert.ok(
    source.includes('setDegradedReasons(degradedReasons, \'pending_actions_scan\');'),
    'Pending-actions controller must persist degraded reason scan context'
  );
  assert.ok(
    source.includes('healthState'),
    'Pending-actions response must include healthState field'
  );
  assert.ok(
    source.includes('degradedReasons,'),
    'Pending-actions response must include degradedReasons field'
  );
  assert.ok(
    source.includes('recoveryRunning: runtime.recoveryRunning,'),
    'Pending-actions response must include recoveryRunning flag'
  );
  assert.ok(
    source.includes('startupPhase: runtime.startupPhase,'),
    'Pending-actions response must include startupPhase field'
  );
}

async function testRuntimeStatusTracksRecoveryContextAndResults() {
  const source = await readRepoFile('speypos-local/src/system/runtimeStatus.js');

  assert.ok(
    source.includes('recordRecoveryResult({ context = \'startup\', printRetry, telegramRetry })'),
    'Runtime status must record recovery result context and payload'
  );
  assert.ok(
    source.includes('state.lastRecoveryRun = {') && source.includes('printRetry: printRetry || null,'),
    'Runtime status must persist printRetry summary in lastRecoveryRun'
  );
  assert.ok(
    source.includes('telegramRetry: telegramRetry || null,'),
    'Runtime status must persist telegramRetry summary in lastRecoveryRun'
  );
  assert.ok(
    source.includes('recordRecoveryError(error, context = \'startup\')'),
    'Runtime status must support recovery error tracking by context'
  );
  assert.ok(
    source.includes('setDegradedReasons([\'recovery_failed\'], \'recovery\');'),
    'Runtime status must move to degraded reasons on recovery errors'
  );
}

async function testRetryEndpointAndWatchdogUseExplicitContexts() {
  const systemController = await readRepoFile('speypos-local/src/controllers/system.controller.js');
  const watchdog = await readRepoFile('speypos-local/src/system/watchdog.js');

  assert.ok(
    systemController.includes('setRecoveryRunning(true, \'manual\');'),
    'Manual retry endpoint must mark recovery running with manual context'
  );
  assert.ok(
    systemController.includes("const printRetry = await recoveryService.retryUnprintedOrders({ context: 'manual' });"),
    'Manual retry endpoint must call print retry with manual context'
  );
  assert.ok(
    systemController.includes('recordRecoveryResult({') && systemController.includes("context: 'manual',"),
    'Manual retry endpoint must record recovery result with manual context'
  );
  assert.ok(
    watchdog.includes("const printRetry = await recoveryService.retryUnprintedOrders({ context: 'startup' });"),
    'Startup watchdog must call print retry with startup context'
  );
  assert.ok(
    watchdog.includes("context: 'startup',"),
    'Startup watchdog must record recovery result with startup context'
  );
}

async function testSystemSurfaceAndFrontendTypesStayInSync() {
  const routes = await readRepoFile('speypos-local/src/routes/system.routes.js');
  const compat = await readRepoFile('speypos-pwa/src/lib/compatibility/system.ts');
  const posTypes = await readRepoFile('speypos-pwa/src/types/pos.ts');

  assert.ok(
    routes.includes("router.get('/system/runtime-status', systemController.getRuntimeStatusSnapshot);"),
    'System routes must expose runtime-status endpoint'
  );
  assert.ok(
    routes.includes("router.get('/system/pending-actions', systemController.getPendingActionsStatus);"),
    'System routes must expose pending-actions endpoint'
  );

  assert.ok(
    compat.includes("getPendingActions: () => systemApi.getPendingActions(),"),
    'System compatibility provider must map pending-actions API'
  );
  assert.ok(
    compat.includes("getRuntimeStatus: () => systemApi.getRuntimeStatus(),"),
    'System compatibility provider must map runtime-status API'
  );

  assert.ok(
    posTypes.includes("healthState: 'healthy' | 'recovering' | 'degraded';"),
    'Frontend pending-actions type must include healthState contract'
  );
  assert.ok(
    posTypes.includes('degradedReasons: string[];') && posTypes.includes('lastRecoveryRun: {'),
    'Frontend runtime types must include degraded reasons and lastRecoveryRun'
  );
}

async function run() {
  await testPendingActionsResponseIncludesOperationalSignals();
  await testRuntimeStatusTracksRecoveryContextAndResults();
  await testRetryEndpointAndWatchdogUseExplicitContexts();
  await testSystemSurfaceAndFrontendTypesStayInSync();
  console.log('Refactor 19 integration checks passed.');
}

run().catch((err) => {
  console.error('Refactor 19 integration checks failed:', err.message);
  process.exit(1);
});