import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

async function readRepoFile(relativePath) {
  return readFile(path.join(repoRoot, relativePath), 'utf8');
}

async function testNativeSystemTriggerRetryUsesBridgeFirst() {
  const systemCompat = await readRepoFile('speypos-pwa/src/lib/compatibility/system.ts');

  assert.ok(
    systemCompat.includes("const result = callNativeBridge<unknown>('triggerPrintQueueRetry');"),
    'Native system compatibility triggerRetry must call native bridge retry trigger first'
  );
  assert.ok(
    systemCompat.includes('return { data: null, error: null };'),
    'Native system compatibility triggerRetry must normalize successful bridge result to null payload'
  );
  assert.ok(
    systemCompat.includes('return httpSystemCompatibilityProvider.triggerRetry();'),
    'Native system compatibility triggerRetry must retain HTTP fallback on bridge error'
  );
}

async function testBridgeExposesNativeRetryAndQueueStatusMethods() {
  const bridgeTs = await readRepoFile('speypos-pwa/src/lib/compatibility/nativeBridge.ts');
  const bridgeKt = await readRepoFile('android-shell/app/src/main/java/com/speypos/shell/SpeyposNativeBridge.kt');

  assert.ok(
    bridgeTs.includes('triggerPrintQueueRetry(): string;') && bridgeTs.includes('getPrintQueueStatus(): string;'),
    'TypeScript bridge contract must include queue retry and status methods'
  );
  assert.ok(
    bridgeKt.includes('fun triggerPrintQueueRetry(): String') && bridgeKt.includes('fun getPrintQueueStatus(): String'),
    'Android bridge implementation must include queue retry and status methods'
  );
}

async function testSystemStatusTypesIncludeQueueFields() {
  const posTypes = await readRepoFile('speypos-pwa/src/types/pos.ts');

  assert.ok(
    posTypes.includes('printerPending?: {') && posTypes.includes('dead_letter_jobs: number;'),
    'PendingActionsStatus type must include optional printerPending queue summary fields'
  );
  assert.ok(
    posTypes.includes('printQueue?: {') && posTypes.includes('next_attempt_at: number | null;'),
    'RuntimeStatus type must include optional printQueue summary fields'
  );
}

async function run() {
  await testNativeSystemTriggerRetryUsesBridgeFirst();
  await testBridgeExposesNativeRetryAndQueueStatusMethods();
  await testSystemStatusTypesIncludeQueueFields();
  console.log('Refactor 23 integration checks passed.');
}

run().catch((err) => {
  console.error('Refactor 23 integration checks failed:', err.message);
  process.exit(1);
});