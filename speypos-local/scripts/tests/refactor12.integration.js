import assert from 'node:assert/strict';

const baseUrl = (process.env.SPEYPOS_PARITY_BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');

function assertType(value, type, message) {
  assert.equal(typeof value, type, message);
}

function assertOptionalType(value, type, message) {
  if (value === undefined || value === null) {
    return;
  }
  assert.equal(typeof value, type, message);
}

async function getJson(path) {
  const url = `${baseUrl}${path}`;
  let response;

  try {
    response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Unable to reach backend at ${url}. ${reason}. ` +
      'Start speypos-local backend first or set SPEYPOS_PARITY_BASE_URL to a reachable server.'
    );
  }

  const body = await response.json().catch(() => null);
  return { response, body };
}

async function assertBackendReachable() {
  const { response, body } = await getJson('/api/health');
  assert.equal(
    response.ok,
    true,
    `Backend health check failed at ${baseUrl}/api/health (status ${response.status}). Body: ${JSON.stringify(body)}`
  );
}

async function testSetupStatusShape() {
  const { response, body } = await getJson('/api/system/setup-status');
  assert.equal(response.status, 200, 'setup-status must return HTTP 200');
  assert.ok(body && typeof body === 'object', 'setup-status body must be an object');
  assertType(body.initialized, 'boolean', 'setup-status.initialized must be boolean');
}

async function testRuntimeStatusShape() {
  const { response, body } = await getJson('/api/system/runtime-status');
  assert.equal(response.status, 200, 'runtime-status must return HTTP 200');
  assert.ok(body && typeof body === 'object', 'runtime-status body must be an object');

  assertType(body.startupPhase, 'string', 'runtime-status.startupPhase must be string');
  assertType(body.recoveryRunning, 'boolean', 'runtime-status.recoveryRunning must be boolean');
  assertType(body.degraded, 'boolean', 'runtime-status.degraded must be boolean');
  assert.ok(Array.isArray(body.degradedReasons), 'runtime-status.degradedReasons must be array');
  assertOptionalType(body.updatedAt, 'string', 'runtime-status.updatedAt must be string when present');

  if (body.lastRecoveryRun !== null) {
    assert.ok(
      body.lastRecoveryRun && typeof body.lastRecoveryRun === 'object',
      'runtime-status.lastRecoveryRun must be object or null'
    );
    assertType(body.lastRecoveryRun.context, 'string', 'runtime-status.lastRecoveryRun.context must be string');
    assertType(body.lastRecoveryRun.at, 'string', 'runtime-status.lastRecoveryRun.at must be string');
  }
}

async function testPendingActionsShape() {
  const { response, body } = await getJson('/api/system/pending-actions');
  assert.equal(response.status, 200, 'pending-actions must return HTTP 200');
  assert.ok(body && typeof body === 'object', 'pending-actions body must be an object');

  assertType(body.hasUnprintedOrders, 'boolean', 'pending-actions.hasUnprintedOrders must be boolean');
  assertType(body.unprintedOrdersCount, 'number', 'pending-actions.unprintedOrdersCount must be number');
  assertType(body.hasUnreportedOrders, 'boolean', 'pending-actions.hasUnreportedOrders must be boolean');
  assertType(body.unreportedOrdersCount, 'number', 'pending-actions.unreportedOrdersCount must be number');
  assertType(body.hasUnreportedShifts, 'boolean', 'pending-actions.hasUnreportedShifts must be boolean');
  assertType(body.unreportedShiftsCount, 'number', 'pending-actions.unreportedShiftsCount must be number');
  assertType(body.isDegraded, 'boolean', 'pending-actions.isDegraded must be boolean');
  assert.ok(
    body.healthState === 'healthy' || body.healthState === 'recovering' || body.healthState === 'degraded',
    'pending-actions.healthState must be healthy, recovering, or degraded'
  );
  assert.ok(Array.isArray(body.degradedReasons), 'pending-actions.degradedReasons must be array');
  assertType(body.recoveryRunning, 'boolean', 'pending-actions.recoveryRunning must be boolean');
  assertType(body.startupPhase, 'string', 'pending-actions.startupPhase must be string');
}

async function testSettingsListShape() {
  const { response, body } = await getJson('/api/settings');
  assert.equal(
    response.status,
    200,
    `settings list must return HTTP 200. If server is in setup mode, run this test in normal mode. Body: ${JSON.stringify(body)}`
  );
  assert.ok(Array.isArray(body), 'settings list body must be an array');

  for (const [index, setting] of body.entries()) {
    assert.ok(setting && typeof setting === 'object', `settings[${index}] must be an object`);
    assertType(setting.id, 'string', `settings[${index}].id must be string`);
    assertType(setting.key, 'string', `settings[${index}].key must be string`);
    assertType(setting.value_type, 'string', `settings[${index}].value_type must be string`);
    assertType(setting.category, 'string', `settings[${index}].category must be string`);
    assert.ok(
      setting.value_type === 'string' ||
        setting.value_type === 'number' ||
        setting.value_type === 'boolean' ||
        setting.value_type === 'json',
      `settings[${index}].value_type must be one of string|number|boolean|json`
    );
    assert.notEqual(setting.value, undefined, `settings[${index}].value must be present`);
  }
}

async function run() {
  await assertBackendReachable();
  await testSetupStatusShape();
  await testRuntimeStatusShape();
  await testPendingActionsShape();
  await testSettingsListShape();
  console.log(`Refactor 12 integration checks passed against ${baseUrl}.`);
}

run().catch((err) => {
  console.error('Refactor 12 integration checks failed:', err.message);
  process.exit(1);
});