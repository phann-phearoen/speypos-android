import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

async function readRepoFile(relativePath) {
  return readFile(path.join(repoRoot, relativePath), 'utf8');
}

async function testSystemCompatibilityProviderDelegatesToExistingHttpApi() {
  const source = await readRepoFile('speypos-pwa/src/lib/compatibility/system.ts');

  assert.ok(
    source.includes("getSetupStatus: () => setupApi.getStatus()"),
    'System compatibility provider must delegate setup status to setupApi.getStatus()'
  );
  assert.ok(
    source.includes("getPendingActions: () => systemApi.getPendingActions()"),
    'System compatibility provider must delegate pending actions to systemApi.getPendingActions()'
  );
  assert.ok(
    source.includes("getRuntimeStatus: () => systemApi.getRuntimeStatus()"),
    'System compatibility provider must delegate runtime status to systemApi.getRuntimeStatus()'
  );
  assert.ok(
    source.includes("triggerRetry: () => systemApi.triggerRetry()"),
    'System compatibility provider must delegate retry trigger to systemApi.triggerRetry()'
  );
}

async function testSettingsCompatibilityProviderDelegatesToExistingHttpApi() {
  const source = await readRepoFile('speypos-pwa/src/lib/compatibility/settings.ts');

  assert.ok(
    source.includes("getAllSettings: () => settingsApi.getAll()"),
    'Settings compatibility provider must delegate to settingsApi.getAll()'
  );
  assert.ok(
    source.includes("getStore: () => storeApi.get()"),
    'Settings compatibility provider must delegate to storeApi.get()'
  );
}

async function testSetupContextUsesCompatibilityProvider() {
  const source = await readRepoFile('speypos-pwa/src/contexts/SetupContext.tsx');

  assert.ok(
    source.includes("import { getSystemCompatibilityProvider } from '@/lib/compatibility/system';"),
    'SetupContext must import system compatibility provider'
  );
  assert.equal(
    source.includes("import { setupApi } from '@/lib/api';"),
    false,
    'SetupContext must not import setupApi directly'
  );
  assert.ok(
    source.includes('await systemCompatibility.getSetupStatus()'),
    'SetupContext must fetch setup status through compatibility provider'
  );
}

async function testPendingActionsContextUsesCompatibilityProvider() {
  const source = await readRepoFile('speypos-pwa/src/contexts/PendingActionsContext.tsx');

  assert.ok(
    source.includes("import { getSystemCompatibilityProvider } from '@/lib/compatibility/system';"),
    'PendingActionsContext must import system compatibility provider'
  );
  assert.equal(
    source.includes("import { systemApi } from '@/lib/api';"),
    false,
    'PendingActionsContext must not import systemApi directly'
  );
  assert.ok(
    source.includes('await systemCompatibility.getPendingActions()'),
    'PendingActionsContext must fetch pending actions through compatibility provider'
  );
  assert.ok(
    source.includes('await systemCompatibility.triggerRetry()'),
    'PendingActionsContext must trigger retry through compatibility provider'
  );
}

async function testSettingsContextUsesCompatibilityProvider() {
  const source = await readRepoFile('speypos-pwa/src/contexts/SettingsContext.tsx');

  assert.ok(
    source.includes("import { getSettingsCompatibilityProvider } from '@/lib/compatibility/settings';"),
    'SettingsContext must import settings compatibility provider'
  );
  assert.equal(
    source.includes("import { settingsApi, storeApi, resolveImageUrl } from '@/lib/api';"),
    false,
    'SettingsContext must not import settingsApi/storeApi directly'
  );
  assert.ok(
    source.includes('await settingsCompatibility.getAllSettings()'),
    'SettingsContext must fetch settings through compatibility provider'
  );
  assert.ok(
    source.includes('await settingsCompatibility.getStore()'),
    'SettingsContext must fetch store through compatibility provider'
  );
}

async function run() {
  await testSystemCompatibilityProviderDelegatesToExistingHttpApi();
  await testSettingsCompatibilityProviderDelegatesToExistingHttpApi();
  await testSetupContextUsesCompatibilityProvider();
  await testPendingActionsContextUsesCompatibilityProvider();
  await testSettingsContextUsesCompatibilityProvider();
  console.log('Refactor 11 integration checks passed.');
}

run().catch((err) => {
  console.error('Refactor 11 integration checks failed:', err.message);
  process.exit(1);
});