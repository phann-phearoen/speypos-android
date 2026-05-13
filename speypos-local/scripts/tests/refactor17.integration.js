import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

async function readRepoFile(relativePath) {
  return readFile(path.join(repoRoot, relativePath), 'utf8');
}

function assertOrdered(source, snippets, message) {
  let cursor = -1;
  for (const snippet of snippets) {
    const nextIndex = source.indexOf(snippet, cursor + 1);
    assert.ok(nextIndex !== -1, `Missing required snippet in ordering check: ${snippet}`);
    assert.ok(nextIndex > cursor, `Ordering violation around snippet: ${snippet}`);
    cursor = nextIndex;
  }
  assert.ok(true, message);
}

async function testPaymentFlowPreservesCreatePayPrintSequence() {
  const paymentPage = await readRepoFile('speypos-pwa/src/pages/pos/PaymentPage.tsx');

  assertOrdered(
    paymentPage,
    [
      'const createResult = await orderCompatibility.createOrder(buildOrderPayload());',
      'await orderCompatibility.payOrder(createResult.data.id, paymentPayload);',
      "await orderCompatibility.printReceipt(createResult.data.id, 'initial');",
    ],
    'Payment flow must execute create -> pay -> initial print in sequence'
  );

  assert.ok(
    paymentPage.includes('if (createResult.data?.id) {'),
    'Payment flow must gate pay/print orchestration on created order id presence'
  );
  assert.ok(
    paymentPage.includes('await updateToCompleted();'),
    'Payment flow must continue completion transition after orchestration branch'
  );
}

async function testCompatibilityProviderFallbackForTransactionalOrchestration() {
  const orderCompatibility = await readRepoFile('speypos-pwa/src/lib/compatibility/order.ts');

  assert.ok(
    orderCompatibility.includes("const result = callNativeBridge<Order>('createOrder', JSON.stringify(payload));"),
    'Native compatibility must attempt createOrder bridge call first'
  );
  assert.ok(
    orderCompatibility.includes('return httpOrderCompatibilityProvider.createOrder(payload);'),
    'createOrder must fall back to HTTP provider on native bridge failure'
  );

  assert.ok(
    orderCompatibility.includes("const result = callNativeBridge<Order>('payOrder', orderId, JSON.stringify(payload));"),
    'Native compatibility must attempt payOrder bridge call first'
  );
  assert.ok(
    orderCompatibility.includes('return httpOrderCompatibilityProvider.payOrder(orderId, payload);'),
    'payOrder must fall back to HTTP provider on native bridge failure'
  );

  assert.ok(
    orderCompatibility.includes("const result = callNativeBridge<Order>('printReceipt', orderId, mode);"),
    'Native compatibility must attempt printReceipt bridge call first'
  );
  assert.ok(
    orderCompatibility.includes('return httpOrderCompatibilityProvider.printReceipt(orderId);'),
    'printReceipt must fall back to HTTP provider on native bridge failure'
  );
}

async function testApiAndControllerPaymentPrintContractsStayStable() {
  const apiSource = await readRepoFile('speypos-pwa/src/lib/api.ts');
  const orderController = await readRepoFile('speypos-local/src/controllers/order.controller.js');

  assert.ok(
    apiSource.includes("payOrder: (orderId: string, payment: any) =>") &&
      apiSource.includes("request<any>(`/orders/${orderId}/pay`, {"),
    'Frontend API client must keep order payment endpoint contract'
  );
  assert.ok(
    apiSource.includes("printReceipt: (orderId: string) =>") &&
      apiSource.includes("request<any>(`/orders/${orderId}/print`, { method: 'POST' }),"),
    'Frontend API client must keep order print endpoint contract'
  );

  assert.ok(
    orderController.includes("if (order.status !== ORDER_STATUS.PENDING) {") &&
      orderController.includes("Current status: ${order.status}"),
    'Backend payment controller must enforce pending-only payment transition'
  );
  assert.ok(
    orderController.includes('if (![ORDER_STATUS.COMPLETED, ORDER_STATUS.VOIDED].includes(order.status))'),
    'Backend print controller must enforce printable status gate'
  );
}

async function run() {
  await testPaymentFlowPreservesCreatePayPrintSequence();
  await testCompatibilityProviderFallbackForTransactionalOrchestration();
  await testApiAndControllerPaymentPrintContractsStayStable();
  console.log('Refactor 17 integration checks passed.');
}

run().catch((err) => {
  console.error('Refactor 17 integration checks failed:', err.message);
  process.exit(1);
});