import assert from 'node:assert/strict';
import net from 'net';
import { readFile } from 'node:fs/promises';
import { renderReceiptAsEscPos } from '../../src/printer/escpos/receiptEscPosRenderer.js';
import { sendToRawTcp9100Printer } from '../../src/printer/transports/rawTcp9100Transport.js';

function buildCompletedOrder() {
  return {
    id: 'abcd-1234-efgh',
    created_at: Date.now(),
    status: 'completed',
    language: 'en',
    items: [
      {
        menu_item_name: 'Iced Latte',
        quantity: 2,
        customizations: [{ value: 'Less sugar' }],
        toppings: [{ name: 'Pearl', quantity: 1, unit_label: 'qty' }],
      },
    ],
    payments: [],
  };
}

function buildVoidedOrder() {
  return {
    ...buildCompletedOrder(),
    status: 'voided',
    void_reason: 'wrong_item',
    void_note: 'Barista correction',
    voided_at: Date.now(),
    staff: { name: 'Alice' },
    voided_by_staff: { name: 'Bob' },
  };
}

async function testEscPosPayloadGeneration() {
  const payload = renderReceiptAsEscPos(buildCompletedOrder(), 'INTERNAL');

  assert.ok(Buffer.isBuffer(payload), 'ESC/POS renderer should return a Buffer');
  assert.equal(payload[0], 0x1b, 'ESC/POS payload should start with ESC init command');
  assert.equal(payload[1], 0x40, 'ESC/POS payload should include init mode byte');

  const asText = payload.toString('utf8');
  assert.ok(asText.includes('Iced Latte'), 'Rendered receipt should include item name');
  assert.ok(asText.includes('Order ID: abcd'), 'Rendered receipt should include short order ID');
}

async function testEscPosVoidPayloadGeneration() {
  const payload = renderReceiptAsEscPos(buildVoidedOrder(), 'VOID');
  const asText = payload.toString('utf8');

  assert.ok(asText.includes('Voided'), 'Voided receipt should include voided status marker');
  assert.ok(asText.includes('Barista correction'), 'Voided receipt should include void note');
  assert.ok(asText.includes('Bob'), 'Voided receipt should include voided-by staff');

  const cutIndex = payload.lastIndexOf(Buffer.from([0x1d, 0x56, 0x00]));
  assert.ok(cutIndex > 0, 'ESC/POS payload should include paper cut command');
}

async function testRawTcpByteTransport() {
  let received = Buffer.alloc(0);

  const server = net.createServer((socket) => {
    socket.on('data', (chunk) => {
      received = Buffer.concat([received, chunk]);
    });
  });

  await new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  const address = server.address();
  assert.ok(address && typeof address === 'object', 'Server address should be available');

  const payload = renderReceiptAsEscPos(buildCompletedOrder(), 'INTERNAL');

  await sendToRawTcp9100Printer(
    payload,
    {
      host: '127.0.0.1',
      port: address.port,
      timeoutMs: 3000,
      profile: 'refactor3-test',
    },
    {
      orderId: 'refactor3-test',
      variant: 'INTERNAL',
      copy: 1,
    }
  );

  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(received.equals(payload), true, 'RAW TCP transport should send bytes unchanged');

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function testNoPuppeteerDependency() {
  const packageJson = await readFile(new URL('../../package.json', import.meta.url), 'utf8');
  assert.equal(
    packageJson.includes('puppeteer'),
    false,
    'Backend package.json should not depend on puppeteer for receipt generation'
  );
}

async function run() {
  await testEscPosPayloadGeneration();
  await testEscPosVoidPayloadGeneration();
  await testRawTcpByteTransport();
  await testNoPuppeteerDependency();
  console.log('Refactor 3 integration checks passed.');
}

run().catch((error) => {
  console.error('Refactor 3 integration checks failed:', error.message);
  process.exit(1);
});
