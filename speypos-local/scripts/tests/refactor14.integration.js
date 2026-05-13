import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

async function readRepoFile(relativePath) {
  return readFile(path.join(repoRoot, relativePath), 'utf8');
}

async function testRetryUnprintedServiceDefinesDeterministicRetryContract() {
  const source = await readRepoFile('speypos-local/src/services/retry-unprinted.service.js');

  assert.ok(
    source.includes('maxAttemptsPerRun = Number.isInteger(maxAttempts) && maxAttempts > 0'),
    'Retry service must cap per-run attempts via maxAttemptsPerRun'
  );
  assert.ok(
    source.includes("stoppedReason = 'max_attempts_reached'"),
    'Retry service must expose max-attempt stop reason'
  );
  assert.ok(
    source.includes("stoppedReason = 'first_error'"),
    'Retry service must expose first-error stop reason'
  );
  assert.ok(
    source.includes('skippedIneligibleStatus += 1;'),
    'Retry service must track skipped ineligible statuses'
  );
  assert.ok(
    source.includes('const remaining = Math.max(total - processed, 0);'),
    'Retry service must report remaining retryable records'
  );
}

async function testRecoveryServiceWiresRetryControlsAndDependencies() {
  const source = await readRepoFile('speypos-local/src/services/recovery.service.js');

  assert.ok(
    source.includes("process.env.PRINT_RETRY_MAX_ATTEMPTS_PER_RUN"),
    'Recovery service must read PRINT_RETRY_MAX_ATTEMPTS_PER_RUN'
  );
  assert.ok(
    source.includes("process.env.PRINT_RETRY_STOP_ON_ERROR"),
    'Recovery service must read PRINT_RETRY_STOP_ON_ERROR'
  );
  assert.ok(
    source.includes('printReceipt: printerService.printReceipt,'),
    'Recovery service must inject printerService.printReceipt into retry orchestration'
  );
  assert.ok(
    source.includes('context,'),
    'Recovery service must forward retry context for observability'
  );
}

async function testSystemControllerExposesRetryOperationalSurface() {
  const source = await readRepoFile('speypos-local/src/controllers/system.controller.js');

  assert.ok(
    source.includes('const printerPending = recoveryService.getPrinterPendingMetrics();'),
    'System controller must expose printer pending metrics in pending-actions status'
  );
  assert.ok(
    source.includes('printerPending,'),
    'Pending-actions payload must include printerPending summary'
  );
  assert.ok(
    source.includes("const printRetry = await recoveryService.retryUnprintedOrders({ context: 'manual' });"),
    'Manual retry endpoint must run print retry with manual context'
  );
}

async function testOrderAndStartupFlowsTriggerRetryOrchestration() {
  const orderControllerSource = await readRepoFile('speypos-local/src/controllers/order.controller.js');
  const watchdogSource = await readRepoFile('speypos-local/src/system/watchdog.js');

  assert.ok(
    orderControllerSource.includes('recoveryService.retryUnprintedOrders();'),
    'Order controller flows must trigger background print retry orchestration'
  );
  assert.ok(
    watchdogSource.includes("const printRetry = await recoveryService.retryUnprintedOrders({ context: 'startup' });"),
    'Startup watchdog must run print retry with startup context'
  );
}

async function testNativeStoreMaintainsDuplicatePrintGuardSignal() {
  const source = await readRepoFile('android-shell/app/src/main/java/com/speypos/shell/NativeConfigStore.kt');

  assert.ok(
    source.includes('if (!allowReprint && order.optInt("print_count", 0) > 0)'),
    'Native store must keep duplicate initial print prevention guard'
  );
  assert.ok(
    source.includes('.put("duplicate_print_prevented", true)'),
    'Native store must surface duplicate print prevention result'
  );
}

async function run() {
  await testRetryUnprintedServiceDefinesDeterministicRetryContract();
  await testRecoveryServiceWiresRetryControlsAndDependencies();
  await testSystemControllerExposesRetryOperationalSurface();
  await testOrderAndStartupFlowsTriggerRetryOrchestration();
  await testNativeStoreMaintainsDuplicatePrintGuardSignal();
  console.log('Refactor 14 integration checks passed.');
}

run().catch((err) => {
  console.error('Refactor 14 integration checks failed:', err.message);
  process.exit(1);
});