import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

async function readRepoFile(relativePath) {
  return readFile(path.join(repoRoot, relativePath), 'utf8');
}

async function testOrderPrintRouteAndCompatibilityContractRemainAligned() {
  const routes = await readRepoFile('speypos-local/src/routes/order.routes.js');
  const compatibility = await readRepoFile('speypos-pwa/src/lib/compatibility/order.ts');
  const completePage = await readRepoFile('speypos-pwa/src/pages/pos/CompletePage.tsx');

  assert.ok(
    routes.includes("router.post('/orders/:id/print', printOrderReceipt);"),
    'Order routes must expose receipt print endpoint'
  );
  assert.ok(
    compatibility.includes("printReceipt: (orderId: string) => orderApi.printReceipt(orderId),"),
    'HTTP compatibility provider must map printReceipt to orderApi.printReceipt'
  );
  assert.ok(
    completePage.includes("await orderCompatibility.printReceipt(orderId, 'reprint');"),
    'Complete page must request reprint mode explicitly on manual reprint'
  );
}

async function testControllerGuardsPrintableStatesAndTriggersRetry() {
  const controller = await readRepoFile('speypos-local/src/controllers/order.controller.js');

  assert.ok(
    controller.includes('if (![ORDER_STATUS.COMPLETED, ORDER_STATUS.VOIDED].includes(order.status))'),
    'Print controller must only allow completed or voided orders'
  );
  assert.ok(
    controller.includes('await printReceipt(fullOrder);'),
    'Print controller must execute printer service on eligible orders'
  );
  assert.ok(
    controller.includes('recoveryService.retryUnprintedOrders();'),
    'Print controller must trigger retry pass after successful print'
  );
  assert.ok(
    controller.includes("res.status(200).json({ message: 'Receipt has been sent to the printer.' });"),
    'Print controller success response contract must be stable'
  );
}

async function testPrinterServicePrintLifecycleGuardsAndPersistence() {
  const printerService = await readRepoFile('speypos-local/src/printer/printerService.js');

  assert.ok(
    printerService.includes('if (order.printed_at) {'),
    'Printer service must skip already printed orders to prevent duplicates'
  );
  assert.ok(
    printerService.includes('if (![ORDER_STATUS.COMPLETED, ORDER_STATUS.VOIDED].includes(order.status))'),
    'Printer service must guard printable statuses'
  );
  assert.ok(
    printerService.includes('orderRepo.markAsPrinted(order.id);'),
    'Printer service must mark orders printed only after successful send'
  );
  assert.ok(
    printerService.includes('// Do not mark as printed if there was an error.'),
    'Printer service must preserve retryability on printer failure'
  );
}

async function testOrderRepositoryTracksPrintAndVoidReceiptLifecycle() {
  const orderRepo = await readRepoFile('speypos-local/src/storage/repositories/order.repo.js');

  assert.ok(
    orderRepo.includes('UPDATE "Order" SET printed_at = unixepoch() WHERE id = ?'),
    'Order repository must persist printed_at timestamp'
  );
  assert.ok(
    orderRepo.includes("SELECT * FROM \"Order\" WHERE printed_at IS NULL"),
    'Order repository must expose unprinted queue scan'
  );
  assert.ok(
    orderRepo.includes('printed_at = NULL,'),
    'Voiding an order must reset printed_at to re-enable void receipt printing'
  );
}

async function testNativeReceiptGuardStillSignalsDuplicatePrevention() {
  const nativeStore = await readRepoFile('android-shell/app/src/main/java/com/speypos/shell/NativeConfigStore.kt');

  assert.ok(
    nativeStore.includes('if (!allowReprint && order.optInt("print_count", 0) > 0)'),
    'Native bridge store must preserve initial print duplicate guard'
  );
  assert.ok(
    nativeStore.includes('.put("duplicate_print_prevented", true)'),
    'Native bridge store must expose duplicate prevention state'
  );
}

async function run() {
  await testOrderPrintRouteAndCompatibilityContractRemainAligned();
  await testControllerGuardsPrintableStatesAndTriggersRetry();
  await testPrinterServicePrintLifecycleGuardsAndPersistence();
  await testOrderRepositoryTracksPrintAndVoidReceiptLifecycle();
  await testNativeReceiptGuardStillSignalsDuplicatePrevention();
  console.log('Refactor 16 integration checks passed.');
}

run().catch((err) => {
  console.error('Refactor 16 integration checks failed:', err.message);
  process.exit(1);
});