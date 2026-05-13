import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

async function readRepoFile(relativePath) {
  return readFile(path.join(repoRoot, relativePath), 'utf8');
}

async function testPrinterSettingDefaultsIncludeLockedConnectionMethod() {
  const settingsService = await readRepoFile('speypos-local/src/services/settings.service.js');
  const nativeStore = await readRepoFile('android-shell/app/src/main/java/com/speypos/shell/NativeConfigStore.kt');

  assert.ok(
    settingsService.includes("connection_method: 'lan'"),
    'Backend printer default must include connection_method'
  );
  assert.ok(
    nativeStore.includes('.put("connection_method", "lan")'),
    'Android native default printer setting must include connection_method'
  );
}

async function testPrinterValidatorLocksLanAndWifiOnly() {
  const validator = await readRepoFile('speypos-local/src/validators/settings.validator.js');

  assert.ok(
    validator.includes("'connection_method'"),
    'Printer validator schema must include connection_method key'
  );
  assert.ok(
    validator.includes("const connectionMethod = value.connection_method ?? 'lan';"),
    'Printer validator must normalize missing connection_method for backward compatibility'
  );
  assert.ok(
    validator.includes("connectionMethod !== 'lan' && connectionMethod !== 'wifi'"),
    'Printer validator must allow only lan or wifi connection methods'
  );
}

async function testPrinterRuntimeAndToolUseConnectionMethod() {
  const printerService = await readRepoFile('speypos-local/src/printer/printerService.js');
  const tool = await readRepoFile('speypos-local/scripts/printer-lan-tool.js');

  assert.ok(
    printerService.includes("const connectionMethod = lan.connection_method === 'wifi' ? 'wifi' : 'lan';"),
    'Printer runtime must resolve connection method as lan or wifi'
  );
  assert.ok(
    printerService.includes('printerConnectionMethod'),
    'Printer runtime logs must include resolved connection method'
  );

  assert.ok(
    tool.includes('function parseMethod(name, fallback = \'lan\') {'),
    'Printer CLI tool must parse method option'
  );
  assert.ok(
    tool.includes("['lan', 'wifi'].includes(method)"),
    'Printer CLI tool must enforce lan/wifi method options'
  );
  assert.ok(
    tool.includes('connection_method: parseMethod('),
    'Printer CLI set command must persist connection_method'
  );
}

async function run() {
  await testPrinterSettingDefaultsIncludeLockedConnectionMethod();
  await testPrinterValidatorLocksLanAndWifiOnly();
  await testPrinterRuntimeAndToolUseConnectionMethod();
  console.log('Refactor 21 integration checks passed.');
}

run().catch((err) => {
  console.error('Refactor 21 integration checks failed:', err.message);
  process.exit(1);
});