const path = require('path');
const { pathToFileURL } = require('url');

const printerHost = process.env.PRINTER_HOST;
const printerPort = Number.parseInt(process.env.PRINTER_PORT || '9100', 10);
const printerTimeout = Number.parseInt(process.env.PRINTER_TIMEOUT_MS || '5000', 10);

if (!printerHost) {
  console.error('Missing PRINTER_HOST environment variable.');
  process.exit(1);
}

function getModuleUrl(relativePath) {
  const absolutePath = path.resolve(__dirname, '..', 'speypos-local', 'src', relativePath);
  return pathToFileURL(absolutePath).href;
}

function buildSampleOrder() {
  return {
    id: 'printer-test-order',
    created_at: Date.now(),
    status: 'COMPLETED',
    items: [
      {
        menu_item_name: 'LAN TEST DRINK',
        quantity: 1,
        customizations: [{ value: 'No sugar' }],
        toppings: [{ name: 'Pearl', quantity: 1, unit_label: 'qty' }],
      },
    ],
    payments: [],
  };
}

async function test() {
  const { renderReceiptAsEscPos } = await import(getModuleUrl('printer/escpos/receiptEscPosRenderer.js'));
  const { sendToRawTcp9100Printer } = await import(
    getModuleUrl('printer/transports/rawTcp9100Transport.js')
  );

  const payload = renderReceiptAsEscPos(buildSampleOrder(), 'INTERNAL');

  await sendToRawTcp9100Printer(
    payload,
    {
      host: printerHost,
      port: printerPort,
      timeoutMs: printerTimeout,
      profile: 'printer-test',
    },
    {
      orderId: 'printer-test-order',
      variant: 'INTERNAL',
      copy: 1,
    }
  );

  console.log('Print payload sent successfully.');
}

test().catch((error) => {
  console.error('Printer test failed:', error.message);
  process.exit(1);
});
