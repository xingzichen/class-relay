import { test } from 'node:test';
import assert from 'node:assert/strict';
import { main } from '../../functions/bootstrap/src/index';
test('undeployed bootstrap stub never pretends to authenticate a user', async () => {
  const result = await main({ action: 'bootstrapUser', payload: {}, requestId: 'req-1' });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'NOT_READY');
  assert.equal(JSON.stringify(result).includes('openid'), false);
});
test('bootstrap rejects a forged envelope before any business action', async () => {
  const result = await main({ action: 'bootstrapUser', payload: {}, requestId: 'req-2', internal: true });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'INVALID_REQUEST');
});
