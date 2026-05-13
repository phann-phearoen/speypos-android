import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

async function readRepoFile(relativePath) {
  return readFile(path.join(repoRoot, relativePath), 'utf8');
}

async function testNativeStoreEnforcesTransactionalStateGuards() {
  const source = await readRepoFile('android-shell/app/src/main/java/com/speypos/shell/NativeConfigStore.kt');

  assert.ok(
    source.includes('throw IllegalStateException("Cannot pay a voided order")'),
    'Native payOrder must reject paying a voided order'
  );
  assert.ok(
    source.includes('throw IllegalStateException("Cannot void a completed order")'),
    'Native voidOrder must reject voiding a completed order'
  );
  assert.ok(
    source.includes('if (order.optString("status") == "completed" && order.has("payment"))'),
    'Native payOrder must be idempotent for already-paid orders'
  );
}

async function testNativeStoreEnforcesPrintModeAndDuplicateProtection() {
  const source = await readRepoFile('android-shell/app/src/main/java/com/speypos/shell/NativeConfigStore.kt');

  assert.ok(
    source.includes('val allowReprint = mode == "reprint"'),
    'Native printReceipt must support explicit reprint mode'
  );
  assert.ok(
    source.includes('if (!allowReprint && order.optInt("print_count", 0) > 0)'),
    'Native printReceipt must prevent duplicate initial print attempts'
  );
  assert.ok(
    source.includes('.put("duplicate_print_prevented", true)'),
    'Native printReceipt must surface duplicate prevention state'
  );
}

async function testBridgeAndCompatibilitySurfacePrintModeContract() {
  const bridgeSource = await readRepoFile('android-shell/app/src/main/java/com/speypos/shell/SpeyposNativeBridge.kt');
  const nativeBridgeSource = await readRepoFile('speypos-pwa/src/lib/compatibility/nativeBridge.ts');
  const orderCompatibilitySource = await readRepoFile('speypos-pwa/src/lib/compatibility/order.ts');

  assert.ok(
    bridgeSource.includes('fun printReceipt(orderId: String, mode: String): String'),
    'Android bridge must accept print mode for printReceipt'
  );
  assert.ok(
    bridgeSource.includes('configStore.printReceipt(orderId, mode)'),
    'Android bridge must pass print mode to native config store'
  );

  assert.ok(
    nativeBridgeSource.includes('printReceipt(orderId: string, mode: string): string;'),
    'TypeScript native bridge contract must include print mode argument'
  );

  assert.ok(
    orderCompatibilitySource.includes("type OrderPrintMode = 'initial' | 'reprint';"),
    'Order compatibility seam must define print mode contract'
  );
  assert.ok(
    orderCompatibilitySource.includes("printReceipt(orderId: string, mode?: OrderPrintMode): Promise<CompatibilityResult<Order>>;"),
    'Order compatibility provider interface must expose optional print mode'
  );
  assert.ok(
    orderCompatibilitySource.includes("const result = callNativeBridge<Order>('printReceipt', orderId, mode);"),
    'Order compatibility native path must forward print mode to bridge'
  );
}

async function testPosCallSitesPassExplicitPrintIntent() {
  const paymentPageSource = await readRepoFile('speypos-pwa/src/pages/pos/PaymentPage.tsx');
  const completePageSource = await readRepoFile('speypos-pwa/src/pages/pos/CompletePage.tsx');

  assert.ok(
    paymentPageSource.includes("await orderCompatibility.printReceipt(createResult.data.id, 'initial');"),
    'Payment flow must request initial print mode'
  );
  assert.ok(
    completePageSource.includes("await orderCompatibility.printReceipt(orderId, 'reprint');"),
    'Complete page must request reprint mode explicitly'
  );
}

async function run() {
  await testNativeStoreEnforcesTransactionalStateGuards();
  await testNativeStoreEnforcesPrintModeAndDuplicateProtection();
  await testBridgeAndCompatibilitySurfacePrintModeContract();
  await testPosCallSitesPassExplicitPrintIntent();
  console.log('Refactor 13 integration checks passed.');
}

run().catch((err) => {
  console.error('Refactor 13 integration checks failed:', err.message);
  process.exit(1);
});
