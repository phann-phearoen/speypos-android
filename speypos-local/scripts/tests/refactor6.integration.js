import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const localRoot = path.resolve(__dirname, '../..');
const setupSh = path.join(repoRoot, 'scripts/termux/setup.sh');

async function testEnginesField() {
  const src = await readFile(path.join(localRoot, 'package.json'), 'utf8');
  const pkg = JSON.parse(src);
  assert.ok(pkg.engines, 'package.json must have an "engines" field');
  assert.ok(pkg.engines.node, 'engines must specify a node version constraint');
  assert.ok(
    pkg.engines.node.includes('22') || pkg.engines.node.includes('>='),
    'engines.node must reference v22 or a ">=" constraint'
  );
}

async function testBetterSqlite3ExactPin() {
  const src = await readFile(path.join(localRoot, 'package.json'), 'utf8');
  const pkg = JSON.parse(src);
  const ver = pkg.dependencies['better-sqlite3'];
  assert.ok(ver, 'better-sqlite3 must be listed in dependencies');
  assert.equal(
    ver[0] === '^' || ver[0] === '~',
    false,
    `better-sqlite3 must be exact-pinned (no ^ or ~), got: ${ver}`
  );
}

async function testSetupShHasBuildTools() {
  const src = await readFile(setupSh, 'utf8');
  for (const tool of ['clang', 'make', 'python', 'pkg-config']) {
    assert.ok(
      src.includes(tool),
      `setup.sh must install build tool: ${tool}`
    );
  }
}

async function testSetupShHasNativeSmokeTest() {
  const src = await readFile(setupSh, 'utf8');
  assert.ok(
    src.includes('better-sqlite3') && src.includes("require("),
    'setup.sh must include a native module smoke test for better-sqlite3'
  );
  assert.ok(
    src.includes("SELECT 1") || src.includes(".exec("),
    'setup.sh smoke test must execute a query to confirm the module works'
  );
}

async function run() {
  await testEnginesField();
  await testBetterSqlite3ExactPin();
  await testSetupShHasBuildTools();
  await testSetupShHasNativeSmokeTest();
  console.log('Refactor 6 integration checks passed.');
}

run().catch((err) => {
  console.error('Refactor 6 integration checks failed:', err.message);
  process.exit(1);
});
