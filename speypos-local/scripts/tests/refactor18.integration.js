import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

async function readRepoFile(relativePath) {
  return readFile(path.join(repoRoot, relativePath), 'utf8');
}

async function testPaymentPageBlocksInitialPrintOnPaymentErrorResult() {
  const source = await readRepoFile('speypos-pwa/src/pages/pos/PaymentPage.tsx');

  assert.ok(
    source.includes("const payResult = await orderCompatibility.payOrder(createResult.data.id, paymentPayload);"),
    'Payment flow must capture payOrder result before initial print step'
  );
  assert.ok(
    source.includes('if (payResult.error || !payResult.data) {'),
    'Payment flow must guard against payOrder error/null data before printing'
  );
  assert.ok(
    source.includes("title: 'Payment Failed'"),
    'Payment flow must surface payment failure feedback'
  );
  assert.ok(
    source.includes('return;'),
    'Payment failure branch must short-circuit before print orchestration'
  );

  const payIndex = source.indexOf('const payResult = await orderCompatibility.payOrder(createResult.data.id, paymentPayload);');
  const guardIndex = source.indexOf('if (payResult.error || !payResult.data) {');
  const printIndex = source.indexOf("const printResult = await orderCompatibility.printReceipt(createResult.data.id, 'initial');");

  assert.ok(payIndex !== -1 && guardIndex !== -1 && printIndex !== -1, 'Pay/guard/print snippets must exist');
  assert.ok(payIndex < guardIndex && guardIndex < printIndex, 'Payment guard must run before initial print call');
}

async function testPaymentFlowKeepsProcessingStateSafeOnEarlyExit() {
  const source = await readRepoFile('speypos-pwa/src/pages/pos/PaymentPage.tsx');

  assert.ok(
    source.includes('try {') && source.includes('} finally {') && source.includes('setProcessing(false);'),
    'Payment flow must use try/finally so processing state resets on all outcomes'
  );
}

async function testNativeBridgeFailureSurfacesRemainDeterministic() {
  const nativeBridge = await readRepoFile('speypos-pwa/src/lib/compatibility/nativeBridge.ts');
  const orderCompatibility = await readRepoFile('speypos-pwa/src/lib/compatibility/order.ts');

  assert.ok(
    nativeBridge.includes("error: 'SpeyPOS native bridge is unavailable.'"),
    'Native bridge helper must return explicit unavailable error surface'
  );
  assert.ok(
    nativeBridge.includes('returned invalid JSON'),
    'Native bridge helper must surface invalid JSON parse failures'
  );
  assert.ok(
    nativeBridge.includes('failed: ${error instanceof Error ? error.message : String(error)}'),
    'Native bridge helper must surface method invocation failures'
  );

  assert.ok(
    orderCompatibility.includes('return httpOrderCompatibilityProvider.payOrder(orderId, payload);'),
    'Order compatibility must fall back to HTTP payOrder when native bridge returns error'
  );
  assert.ok(
    orderCompatibility.includes('return httpOrderCompatibilityProvider.printReceipt(orderId);'),
    'Order compatibility must fall back to HTTP printReceipt when native bridge returns error'
  );
}

async function testHttpRequestErrorSurfaceStaysCompatibleWithFallbackConsumers() {
  const apiSource = await readRepoFile('speypos-pwa/src/lib/api.ts');

  assert.ok(
    apiSource.includes('if (!response.ok) {') && apiSource.includes('return { data: null, error: errorText || `HTTP ${response.status}` };'),
    'API request helper must return structured non-OK errors'
  );
  assert.ok(
    apiSource.includes('error: `Request timed out after ${safeTimeoutMs}ms`'),
    'API request helper must return structured timeout errors'
  );
  assert.ok(
    apiSource.includes("error: error instanceof Error ? error.message : 'Network error'"),
    'API request helper must return structured network errors'
  );
}

async function run() {
  await testPaymentPageBlocksInitialPrintOnPaymentErrorResult();
  await testPaymentFlowKeepsProcessingStateSafeOnEarlyExit();
  await testNativeBridgeFailureSurfacesRemainDeterministic();
  await testHttpRequestErrorSurfaceStaysCompatibleWithFallbackConsumers();
  console.log('Refactor 18 integration checks passed.');
}

run().catch((err) => {
  console.error('Refactor 18 integration checks failed:', err.message);
  process.exit(1);
});