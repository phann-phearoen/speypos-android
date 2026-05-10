import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const localRoot = path.resolve(__dirname, '../..');

async function testBackendReadmeHasTermuxRunbook() {
  const readme = await readFile(path.join(localRoot, 'README.md'), 'utf8');
  assert.ok(readme.includes('Android + Termux Runbook'), 'README must include Android + Termux runbook section');
  assert.ok(readme.includes('termux:setup'), 'README must document termux:setup command');
  assert.ok(readme.includes('termux:start'), 'README must document daily operations commands');
}

async function testBackendReadmeHasTroubleshooting() {
  const readme = await readFile(path.join(localRoot, 'README.md'), 'utf8');
  assert.ok(readme.includes('Troubleshooting'), 'README must include troubleshooting section');
  assert.ok(readme.includes('Printer connectivity failures'), 'README must include printer troubleshooting');
  assert.ok(readme.includes('background kill') || readme.includes('background'), 'README must include background kill troubleshooting');
  assert.ok(readme.includes('Startup failures'), 'README must include startup failure troubleshooting');
}

async function testBackendReadmeHasSupportMatrix() {
  const readme = await readFile(path.join(localRoot, 'README.md'), 'utf8');
  assert.ok(readme.includes('Supported Device and Printer Matrix'), 'README must include support matrix');
  assert.ok(readme.includes('Minimum Requirements'), 'README must include minimum requirements section');
  assert.ok(readme.includes('RAW TCP 9100'), 'README must document supported printer protocol');
}

async function testPwaReadmeNoLongerTemplate() {
  const pwaReadme = await readFile(path.join(repoRoot, 'speypos-pwa/README.md'), 'utf8');
  assert.equal(
    pwaReadme.includes('Welcome to your Lovable project'),
    false,
    'PWA README must not keep the generic Lovable template content'
  );
  assert.ok(pwaReadme.includes('SpeyPOS PWA'), 'PWA README must describe this project');
}

async function run() {
  await testBackendReadmeHasTermuxRunbook();
  await testBackendReadmeHasTroubleshooting();
  await testBackendReadmeHasSupportMatrix();
  await testPwaReadmeNoLongerTemplate();
  console.log('Refactor 10 integration checks passed.');
}

run().catch((err) => {
  console.error('Refactor 10 integration checks failed:', err.message);
  process.exit(1);
});
