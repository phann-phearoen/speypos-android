import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

async function readRepoFile(relativePath) {
  return readFile(path.join(repoRoot, relativePath), 'utf8');
}

async function testNativeStorePersistsPrintQueueAndRetryState() {
  const source = await readRepoFile('android-shell/app/src/main/java/com/speypos/shell/NativeConfigStore.kt');

  assert.ok(
    source.includes('PREF_NATIVE_PRINT_QUEUE_JSON'),
    'Native config store must define persisted print queue preference key'
  );
  assert.ok(
    source.includes('fun processPrintQueue(context: String = "manual", maxAttemptsPerRun: Int = 20): JSONObject'),
    'Native config store must expose print queue processor API'
  );
  assert.ok(
    source.includes('fun getPrintQueueStatus(): JSONObject'),
    'Native config store must expose print queue summary API'
  );
  assert.ok(
    source.includes('computeBackoffMs(attempt: Int): Long'),
    'Native config store must implement retry backoff for print queue'
  );
  assert.ok(
    source.includes('PRINT_JOB_DEAD_LETTER'),
    'Native config store must track dead-letter print jobs'
  );
}

async function testNativeBridgeExposesQueueControlAndStatus() {
  const source = await readRepoFile('android-shell/app/src/main/java/com/speypos/shell/SpeyposNativeBridge.kt');

  assert.ok(
    source.includes('fun getPrintQueueStatus(): String'),
    'Native bridge must expose getPrintQueueStatus()'
  );
  assert.ok(
    source.includes('fun triggerPrintQueueRetry(): String'),
    'Native bridge must expose triggerPrintQueueRetry()'
  );
  assert.ok(
    source.includes('configStore.processPrintQueue("bridge_manual", 50)'),
    'Native bridge retry trigger must process queue with manual bridge context'
  );
  assert.ok(
    source.includes('"printerPending"'),
    'Native pending-actions payload must include printerPending summary'
  );
}

async function testWorkManagerWiringForQueueProcessing() {
  const mainActivity = await readRepoFile('android-shell/app/src/main/java/com/speypos/shell/MainActivity.kt');
  const worker = await readRepoFile('android-shell/app/src/main/java/com/speypos/shell/PrintQueueWorker.kt');
  const gradle = await readRepoFile('android-shell/app/build.gradle.kts');

  assert.ok(
    mainActivity.includes('schedulePrintQueueWorkers()'),
    'MainActivity must schedule print queue workers at startup'
  );
  assert.ok(
    mainActivity.includes('enqueueUniquePeriodicWork(') && mainActivity.includes('PrintQueueWorker'),
    'MainActivity must enqueue periodic print queue worker'
  );
  assert.ok(
    mainActivity.includes('enqueueUniqueWork('),
    'MainActivity must enqueue startup one-time print queue worker'
  );

  assert.ok(
    worker.includes('class PrintQueueWorker') && worker.includes('store.processPrintQueue(context = "worker"'),
    'PrintQueueWorker must run print queue processing using worker context'
  );
  assert.ok(
    gradle.includes('androidx.work:work-runtime-ktx'),
    'Android app module must include WorkManager dependency'
  );
}

async function testTypeScriptNativeBridgeContractIncludesQueueMethods() {
  const source = await readRepoFile('speypos-pwa/src/lib/compatibility/nativeBridge.ts');

  assert.ok(
    source.includes('getPrintQueueStatus(): string;'),
    'TypeScript native bridge contract must include getPrintQueueStatus'
  );
  assert.ok(
    source.includes('triggerPrintQueueRetry(): string;'),
    'TypeScript native bridge contract must include triggerPrintQueueRetry'
  );
}

async function run() {
  await testNativeStorePersistsPrintQueueAndRetryState();
  await testNativeBridgeExposesQueueControlAndStatus();
  await testWorkManagerWiringForQueueProcessing();
  await testTypeScriptNativeBridgeContractIncludesQueueMethods();
  console.log('Refactor 22 integration checks passed.');
}

run().catch((err) => {
  console.error('Refactor 22 integration checks failed:', err.message);
  process.exit(1);
});