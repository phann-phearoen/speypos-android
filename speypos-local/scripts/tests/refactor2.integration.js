import assert from 'node:assert/strict';
import { validateSetting, ValidationError } from '../../src/validators/settings.validator.js';
import { runRetryUnprintedOrders } from '../../src/services/retry-unprinted.service.js';
import { ORDER_STATUS } from '../../src/constants/order.constants.js';

function buildValidPrinterLan() {
  return {
    version: 1,
    enabled: true,
    protocol: 'raw9100',
    host: '192.168.1.50',
    port: 9100,
    timeout_ms: 5000,
    profile: 'default',
  };
}

async function testPrinterLanValidation() {
  validateSetting('printer.lan', buildValidPrinterLan(), 'json');

  assert.throws(
    () =>
      validateSetting(
        'printer.lan',
        {
          ...buildValidPrinterLan(),
          protocol: 'ipp',
        },
        'json'
      ),
    ValidationError
  );

  assert.throws(
    () =>
      validateSetting(
        'printer.lan',
        {
          ...buildValidPrinterLan(),
          enabled: true,
          host: '',
        },
        'json'
      ),
    ValidationError
  );

  assert.throws(
    () =>
      validateSetting(
        'printer.lan',
        {
          ...buildValidPrinterLan(),
          timeout_ms: 100,
        },
        'json'
      ),
    ValidationError
  );
}

async function testRetrySemanticsStopsOnFirstFailure() {
  const logs = [];
  const logger = {
    info: (message) => logs.push(['info', message]),
    warn: (message) => logs.push(['warn', message]),
    error: (message) => logs.push(['error', message]),
  };

  const records = [{ id: 'order-1' }, { id: 'order-2' }, { id: 'order-3' }];
  const printed = [];

  const result = await runRetryUnprintedOrders({
    records,
    getOrderById: (id) => ({ id, status: ORDER_STATUS.COMPLETED }),
    serializeOrder: (order) => order,
    printReceipt: async (order) => {
      printed.push(order.id);
      if (order.id === 'order-2') {
        throw new Error('simulated printer failure');
      }
    },
    logger,
  });

  assert.equal(result.total, 3);
  assert.equal(result.succeeded, 1);
  assert.equal(result.failed, 2);
  assert.deepEqual(printed, ['order-1', 'order-2']);
}

async function testRetrySkipsNonPrintableStatuses() {
  const logger = {
    info: () => {},
    warn: () => {},
    error: () => {},
  };

  const records = [{ id: 'order-a' }, { id: 'order-b' }];
  const printed = [];

  const result = await runRetryUnprintedOrders({
    records,
    getOrderById: (id) => ({
      id,
      status: id === 'order-a' ? ORDER_STATUS.PENDING : ORDER_STATUS.VOIDED,
    }),
    serializeOrder: (order) => order,
    printReceipt: async (order) => {
      printed.push(order.id);
    },
    logger,
  });

  assert.equal(result.total, 2);
  assert.equal(result.succeeded, 1);
  assert.equal(result.failed, 1);
  assert.deepEqual(printed, ['order-b']);
}

async function run() {
  await testPrinterLanValidation();
  await testRetrySemanticsStopsOnFirstFailure();
  await testRetrySkipsNonPrintableStatuses();
  console.log('Refactor 2 integration checks passed.');
}

run().catch((error) => {
  console.error('Refactor 2 integration checks failed:', error.message);
  process.exit(1);
});
