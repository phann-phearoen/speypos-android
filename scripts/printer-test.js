const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer');

const printer = new ThermalPrinter({
  type: PrinterTypes.EPSON,
  interface: 'usb',
  width: 80,
});

async function test() {
  console.log('Checking printer connection...');
  const connected = await printer.isPrinterConnected();
  console.log('Printer connected:', connected);

  if (!connected) return;

  printer.alignCenter();
  printer.println('SPEYPOS PRINTER TEST');
  printer.drawLine();
  printer.println('USB001 / XP-80C');
  printer.println(new Date().toISOString());
  printer.drawLine();
  printer.cut();

  await printer.execute();
  console.log('Print job sent.');
}

test().catch(console.error);