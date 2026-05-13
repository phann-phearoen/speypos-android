import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

async function readRepoFile(relativePath) {
  return readFile(path.join(repoRoot, relativePath), 'utf8');
}

async function testFrontendBuildsIntegerMoneyOrderPayload() {
  const source = await readRepoFile('speypos-pwa/src/pages/pos/PaymentPage.tsx');

  assert.ok(
    source.includes('unit_price: item.unit_price,'),
    'Payment flow order payload must pass per-item unit_price'
  );
  assert.ok(
    source.includes('total_price: t.total_price,'),
    'Payment flow order payload must pass topping total_price'
  );
  assert.ok(
    source.includes('amount: orderTotal,'),
    'Payment payload must use orderTotal as payment amount'
  );
  assert.ok(
    source.includes('received_cash: receivedAmountCents,'),
    'Cash payment payload must use normalized cents for received_cash'
  );
  assert.ok(
    source.includes('change: change,'),
    'Cash payment payload must use cent-based change amount'
  );
}

async function testOrderPageTotalsStayDerivedFromUnitPriceAndQuantity() {
  const source = await readRepoFile('speypos-pwa/src/pages/pos/OrderPage.tsx');

  assert.ok(
    source.includes('const unitPrice = menuItem.price + customizationTotal + toppingTotal;'),
    'Order page must derive unitPrice from base item and option deltas'
  );
  assert.ok(
    source.includes('subtotal: unitPrice * quantity,'),
    'Order page must derive subtotal from unitPrice x quantity'
  );
  assert.ok(
    source.includes('subtotal: item.unit_price * (item.quantity + quantity)'),
    'Order page merged item updates must preserve subtotal derivation'
  );
}

async function testBackendOrderRepoDerivesTotalsFromLineItems() {
  const source = await readRepoFile('speypos-local/src/storage/repositories/order.repo.js');

  assert.ok(
    source.includes('const total_items = items.reduce((sum, item) => sum + item.quantity, 0);'),
    'Order repository must derive total_items from item quantities'
  );
  assert.ok(
    source.includes('const total_amount = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);'),
    'Order repository must derive total_amount from unit_price x quantity'
  );
  assert.ok(
    source.includes('INSERT INTO "Order" (id, shift_id, staff_id, status, customer_type, total_amount, total_items, created_at)'),
    'Order repository must persist derived total_amount and total_items fields'
  );
}

async function testBackendPaymentRepoPersistsExactMonetaryFields() {
  const source = await readRepoFile('speypos-local/src/storage/repositories/payment.repo.js');

  assert.ok(
    source.includes('const { payment_type, amount, received_cash, change } = paymentData;'),
    'Payment repository must preserve payment amount fields from payload'
  );
  assert.ok(
    source.includes('INSERT INTO Payment (id, order_id, status, payment_type, amount, received_cash, change, created_at)'),
    'Payment repository must persist amount/received_cash/change fields'
  );
  assert.ok(
    source.includes('received_cash || null,'),
    'Payment repository must keep optional received_cash semantics'
  );
}

async function testNativeCreateOrderNormalizesAndDerivesTotals() {
  const source = await readRepoFile('android-shell/app/src/main/java/com/speypos/shell/NativeConfigStore.kt');

  assert.ok(
    source.includes('val quantity = item.optInt("quantity", 1).coerceAtLeast(1)'),
    'Native createOrder must coerce quantity to at least 1'
  );
  assert.ok(
    source.includes('val fallbackSubtotal = quantity * unitPrice'),
    'Native createOrder must derive fallback subtotal from quantity x unitPrice'
  );
  assert.ok(
    source.includes('val subtotal = item.optInt("subtotal", fallbackSubtotal)'),
    'Native createOrder must normalize subtotal with deterministic fallback'
  );
  assert.ok(
    source.includes('totalAmount += subtotal'),
    'Native createOrder must aggregate normalized item subtotals'
  );
  assert.ok(
    source.includes('.put("total", totalAmount)') && source.includes('.put("total_amount", totalAmount)'),
    'Native createOrder must keep total and total_amount aligned'
  );
}

async function run() {
  await testFrontendBuildsIntegerMoneyOrderPayload();
  await testOrderPageTotalsStayDerivedFromUnitPriceAndQuantity();
  await testBackendOrderRepoDerivesTotalsFromLineItems();
  await testBackendPaymentRepoPersistsExactMonetaryFields();
  await testNativeCreateOrderNormalizesAndDerivesTotals();
  console.log('Refactor 15 integration checks passed.');
}

run().catch((err) => {
  console.error('Refactor 15 integration checks failed:', err.message);
  process.exit(1);
});