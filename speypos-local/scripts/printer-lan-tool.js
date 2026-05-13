import { initializeDatabase, closeDatabase } from '../src/storage/database.js';
import * as settingsService from '../src/services/settings.service.js';
import { renderReceiptAsEscPos } from '../src/printer/escpos/receiptEscPosRenderer.js';
import { sendToRawTcp9100Printer } from '../src/printer/transports/rawTcp9100Transport.js';

function getArgValue(name) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  if (!arg) return null;
  return arg.split('=')[1];
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function usage() {
  console.log('Usage: node scripts/printer-lan-tool.js <command> [options]');
  console.log('Commands:');
  console.log('  get');
  console.log('  set --host=<ip> [--method=lan|wifi] [--port=9100] [--timeout=5000] [--profile=default] [--enabled=true]');
  console.log('  disable');
  console.log('  test [--message=TEXT]');
}

function ensureInitialized() {
  initializeDatabase();
  settingsService.initializeSettings();
}

function getCurrentConfig() {
  return settingsService.getJSON('printer.lan');
}

function saveConfig(config) {
  settingsService.set({
    key: 'printer.lan',
    value: config,
    value_type: 'json',
    category: 'Printing',
    description: 'Network printer configuration supporting LAN or WiFi',
  });
}

function parseMethod(name, fallback = 'lan') {
  const raw = getArgValue(name);
  const method = (raw || fallback).toLowerCase();
  if (!['lan', 'wifi'].includes(method)) {
    throw new Error(`${name} must be one of: lan, wifi. Received: ${raw}`);
  }
  return method;
}

function parseInteger(name, fallback) {
  const raw = getArgValue(name);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${name} must be an integer, received: ${raw}`);
  }
  return parsed;
}

function parseBoolean(name, fallback) {
  const raw = getArgValue(name);
  if (!raw) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

function printConfig(config) {
  console.log(JSON.stringify(config, null, 2));
}

function buildTestOrder(message) {
  return {
    id: 'printer-lan-tool',
    created_at: Date.now(),
    status: 'COMPLETED',
    language: 'en',
    items: [
      {
        menu_item_name: message || 'LAN TOOL TEST',
        quantity: 1,
        customizations: [],
        toppings: [],
      },
    ],
    payments: [],
  };
}

async function run() {
  const command = process.argv[2];
  if (!command || hasFlag('--help')) {
    usage();
    return;
  }

  ensureInitialized();

  if (command === 'get') {
    printConfig(getCurrentConfig());
    return;
  }

  if (command === 'set') {
    const current = getCurrentConfig();
    const host = getArgValue('--host');
    if (!host) {
      throw new Error('--host is required for set command');
    }

    const next = {
      version: 1,
      enabled: parseBoolean('--enabled', true),
      connection_method: parseMethod('--method', current?.connection_method || 'lan'),
      protocol: 'raw9100',
      host,
      port: parseInteger('--port', current?.port || 9100),
      timeout_ms: parseInteger('--timeout', current?.timeout_ms || 5000),
      profile: getArgValue('--profile') || current?.profile || 'default',
    };

    saveConfig(next);
    console.log('Updated printer.lan configuration:');
    printConfig(next);
    return;
  }

  if (command === 'disable') {
    const current = getCurrentConfig() || {};
    const next = {
      version: 1,
      enabled: false,
      connection_method: current.connection_method === 'wifi' ? 'wifi' : 'lan',
      protocol: 'raw9100',
      host: current.host || '',
      port: current.port || 9100,
      timeout_ms: current.timeout_ms || 5000,
      profile: current.profile || 'default',
    };

    saveConfig(next);
    console.log('Disabled printer.lan configuration.');
    printConfig(next);
    return;
  }

  if (command === 'test') {
    const config = getCurrentConfig();
    if (!config?.enabled) {
      throw new Error('printer.lan is disabled. Enable it before running test.');
    }

    const payload = renderReceiptAsEscPos(buildTestOrder(getArgValue('--message')));
    await sendToRawTcp9100Printer(
      payload,
      {
        host: config.host,
        port: config.port,
        timeoutMs: config.timeout_ms,
        profile: config.profile,
      },
      {
        orderId: 'printer-lan-tool',
        variant: 'INTERNAL',
        copy: 1,
      }
    );

    console.log('LAN printer test payload sent successfully.');
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

run()
  .catch((error) => {
    console.error(`printer-lan-tool error: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => {
    closeDatabase();
  });
