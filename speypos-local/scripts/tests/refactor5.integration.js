import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const termuxDir = path.join(repoRoot, 'scripts/termux');

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readScript(name) {
  return readFile(path.join(termuxDir, name), 'utf8');
}

async function testSetupShExists() {
  const exists = await fileExists(path.join(termuxDir, 'setup.sh'));
  assert.ok(exists, 'scripts/termux/setup.sh must exist');

  const src = await readScript('setup.sh');
  assert.ok(src.includes('pkg install'), 'setup.sh must install Termux packages');
  assert.ok(src.includes('npm --prefix'), 'setup.sh must run npm install');
  assert.ok(src.includes('.termux/boot'), 'setup.sh must register Termux:Boot hook');
  assert.ok(src.includes('.env.example'), 'setup.sh must handle .env setup from .env.example');
}

async function testAllScriptsHaveShebang() {
  const scripts = ['boot.sh', 'start.sh', 'stop.sh', 'restart.sh', 'status.sh', 'logs.sh', 'watchdog.sh', 'setup.sh', 'deploy-pwa.sh'];
  for (const name of scripts) {
    const src = await readScript(name);
    assert.ok(
      src.startsWith('#!/data/data/com.termux/files/usr/bin/bash'),
      `${name} must have the Termux bash shebang as the first line`
    );
  }
}

async function testAllScriptsHaveStrictFlags() {
  const scripts = ['boot.sh', 'start.sh', 'stop.sh', 'restart.sh', 'status.sh', 'logs.sh', 'watchdog.sh', 'setup.sh', 'deploy-pwa.sh'];
  for (const name of scripts) {
    const src = await readScript(name);
    assert.ok(
      src.includes('set -euo pipefail'),
      `${name} must use set -euo pipefail`
    );
  }
}

async function testWatchdogCurlGuard() {
  const src = await readScript('watchdog.sh');
  assert.ok(src.includes('HAS_CURL'), 'watchdog.sh must define HAS_CURL guard');
  assert.ok(src.includes('command -v curl'), 'watchdog.sh must check curl availability');
  assert.ok(
    src.includes('health polling disabled') || src.includes('curl not found'),
    'watchdog.sh must log a warning when curl is unavailable'
  );
}

async function testWatchdogPortSourced() {
  const src = await readScript('watchdog.sh');
  assert.ok(src.includes('PORT='), 'watchdog.sh must read PORT from .env');
  assert.ok(
    src.includes('${PORT}') || src.includes('$PORT'),
    'watchdog.sh must build HEALTH_URL from PORT'
  );
  assert.equal(
    src.includes('127.0.0.1:8080/api/health'),
    false,
    'watchdog.sh must not hardcode port 8080 in HEALTH_URL'
  );
}

async function testNodevmonIgnoresSqlite() {
  const src = await readFile(path.resolve(__dirname, '../../nodemon.json'), 'utf8');
  const config = JSON.parse(src);
  const ignore = config.ignore || [];
  assert.ok(
    ignore.some((p) => p.includes('.db-wal')),
    'nodemon.json must ignore SQLite WAL files'
  );
  assert.ok(
    config.watch,
    'nodemon.json must restrict watch scope'
  );
}

async function testTermuxSetupInRootPackageJson() {
  const src = await readFile(path.join(repoRoot, 'package.json'), 'utf8');
  const pkg = JSON.parse(src);
  assert.ok(pkg.scripts?.['termux:setup'], 'root package.json must have termux:setup script');
  assert.ok(pkg.scripts?.['termux:deploy'], 'root package.json must have termux:deploy script');
  assert.ok(pkg.scripts?.['termux:boot'], 'root package.json must have termux:boot script');
}

async function testStartScriptDeploysPwa() {
  const src = await readScript('start.sh');
  assert.ok(
    src.includes('deploy-pwa.sh'),
    'start.sh must deploy frontend assets before launching the watchdog'
  );
}

async function testStartAndroidScript() {
  const src = await readFile(path.resolve(__dirname, '../../package.json'), 'utf8');
  const pkg = JSON.parse(src);
  assert.ok(pkg.scripts?.['start:android'], 'speypos-local/package.json must have start:android script');
  assert.ok(
    pkg.scripts['start:android'].includes('RUNTIME_PROFILE=android-termux'),
    'start:android must set RUNTIME_PROFILE=android-termux'
  );
}

async function run() {
  await testSetupShExists();
  await testAllScriptsHaveShebang();
  await testAllScriptsHaveStrictFlags();
  await testWatchdogCurlGuard();
  await testWatchdogPortSourced();
  await testStartScriptDeploysPwa();
  await testNodevmonIgnoresSqlite();
  await testTermuxSetupInRootPackageJson();
  await testStartAndroidScript();
  console.log('Refactor 5 integration checks passed.');
}

run().catch((error) => {
  console.error('Refactor 5 integration checks failed:', error.message);
  process.exit(1);
});
