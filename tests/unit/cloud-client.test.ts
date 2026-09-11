import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCloudClient } from '../../miniprogram/src/services/cloud-client';
const request = { action: 'list', payload: {}, requestId: 'req-1' };
test('wx.cloud adapter uses fixed env and maps a valid response', async () => {
  const calls: unknown[] = [];
  const call = createCloudClient({ callFunction: async input => { calls.push(input); return { result: { ok: true, requestId: 'req-1', data: { count: 0 } } }; } }, 'fixture-dev');
  assert.deepEqual(await call('tasks', request), { count: 0 });
  assert.deepEqual(calls, [{ name: 'tasks', data: request, config: { env: 'fixture-dev' } }]);
});
test('client rejects identity/env overrides and malformed requests before wx call', async () => {
  let calls = 0;
  const call = createCloudClient({ callFunction: async () => { calls++; return {}; } }, 'fixture-dev');
  for (const extra of [{ env: 'fixture-prod' }, { openid: 'fake' }, { internal: true }, { payload: { envId: 'fixture-prod' } }, { requestId: '' }]) {
    await assert.rejects(call('tasks', { ...request, ...extra }));
  }
  await assert.rejects(call('dispatchWorker', request));
  assert.equal(calls, 0);
});
test('network failure is mapped without exposing raw SDK details or retrying', async () => {
  let calls = 0;
  const call = createCloudClient({ callFunction: async () => { calls++; throw new Error('secret-token'); } }, 'fixture-dev');
  await assert.rejects(call('tasks', request), error => {
    assert.equal((error as { code: string }).code, 'NETWORK_ERROR');
    assert.equal(String(error).includes('secret-token'), false); return true;
  });
  assert.equal(calls, 1);
});
test('business errors are preserved, unknown errors and mismatched responses rejected', async () => {
  for (const result of [{ ok: false, requestId: 'req-1', error: { code: 'FORBIDDEN' } }, { ok: true, requestId: 'wrong', data: {} }, null, { ok: false, requestId: 'req-1', error: { code: 'MADE_UP' } }]) {
    const call = createCloudClient({ callFunction: async () => ({ result }) }, 'fixture-dev');
    await assert.rejects(call('tasks', request), error => {
      assert.equal((error as { code: string }).code, result && typeof result === 'object' && 'error' in result && result.error?.code === 'FORBIDDEN' ? 'FORBIDDEN' : 'INVALID_RESPONSE'); return true;
    });
  }
});
