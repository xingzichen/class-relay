import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createIdentityProbe } from '../../functions/p0Identity/src/handler';
import { readInvocationIdentity } from '../../packages/cloudbase/src/invocation';
import { createCloudClient } from '../../miniprogram/src/services/cloud-client';

const config = { appId: 'wx1111111111111111', envId: 'test-env' };
const command = { action: 'probeIdentity', payload: {}, requestId: 'identity-1' };
function context(openId = 'synthetic-user-a', appId = config.appId) {
  return { memory_limit_in_mb: 128, time_limit_in_ms: 10000, request_id: 'platform-1', function_version: '$LATEST', function_name: 'p0Identity', namespace: config.envId,
    environment: JSON.stringify({ WX_APPID: appId, WX_OPENID: openId, TCB_ENV: config.envId }) };
}
const wxIdentity = (openId = 'synthetic-user-a', appId = config.appId) => ({ OPENID: openId, APPID: appId, ENV: config.envId });

test('rejected native envelopes expose only bounded structure diagnostics, never field values', async () => {
  const probe = createIdentityProbe(config, () => wxIdentity());
  const result = await probe({ ...command, secret: 'private-value', userInfo: { openId: 'private-openid' } }, context());
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.diagnostics?.event.kind, 'object');
  assert.equal(result.diagnostics?.event.unexpectedFields, 1);
  assert.equal(result.diagnostics?.event.actionType, 'string');
  assert.equal(result.diagnostics?.event.payloadType, 'object');
  assert.equal(result.diagnostics?.event.requestIdType, 'string');
  assert.equal(result.diagnostics?.configuration.appIdValid, true);
  assert.equal(result.diagnostics?.context.namespaceMatches, true);
  for (const privateText of ['private-value', 'private-openid', 'secret', 'synthetic-user-a', config.appId, config.envId]) assert.equal(JSON.stringify(result).includes(privateText), false);
});

test('native userInfo metadata does not break the strict business envelope or supply identity', async () => {
  const probe = createIdentityProbe(config, () => wxIdentity());
  const nativeEvent = { ...command, userInfo: { openId: 'untrusted-metadata', appId: 'wx2222222222222222' } };
  assert.deepEqual(await probe(nativeEvent, context()), await probe(command, context()));
  const missing = await probe(nativeEvent, undefined);
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.equal(missing.error.code, 'UNAUTHENTICATED');
  const forged = await probe({ ...nativeEvent, role: 'SYSTEM_ADMIN' }, context());
  assert.equal(forged.ok, false);
  if (!forged.ok) assert.equal(forged.error.code, 'INVALID_REQUEST');
});

test('request context and WeChat SDK must agree; response contains only a scoped fingerprint', async () => {
  const probe = createIdentityProbe(config, () => wxIdentity());
  const result = await probe(command, context());
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.match(result.data.callerFingerprint, /^[a-f0-9]{64}$/);
    assert.equal(result.data.environmentMatched, true);
  }
  assert.equal(JSON.stringify(result).includes('synthetic-user-a'), false);
  assert.equal(JSON.stringify(result).includes(config.appId), false);
});

test('forged identity, role, internal and environment inputs are rejected', async () => {
  const probe = createIdentityProbe(config, () => wxIdentity());
  for (const payload of [{ openid: 'attacker' }, { role: 'SYSTEM_ADMIN' }, { internal: true }, { envId: 'other-env' }, { APPID: config.appId }, { context: context() }]) {
    const result = await probe({ ...command, payload }, context());
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'INVALID_REQUEST');
  }
});

test('missing, incorrect AppID and SDK identity mismatches fail closed', async () => {
  const probe = createIdentityProbe(config, () => wxIdentity());
  for (const invocation of [undefined, {}, context('', ''), context('synthetic-user-a', 'wx2222222222222222'), context('synthetic-user-b')]) {
    const result = await probe(command, invocation);
    assert.equal(result.ok, false);
  }
  const wrongSdk = createIdentityProbe(config, () => wxIdentity('synthetic-user-a', 'wx2222222222222222'));
  assert.equal((await wrongSdk(command, context())).ok, false);
});

test('warm invocation cannot inherit an earlier caller from process environment or SDK', async () => {
  const probe = createIdentityProbe(config, () => wxIdentity());
  assert.equal((await probe(command, context())).ok, true);
  const inherited = await probe(command, { ...context(), environment: JSON.stringify({ TCB_ENV: config.envId }) });
  assert.equal(inherited.ok, false);
  const sameNamespace = await probe(command, { ...context(), namespace: 'other-env' });
  assert.equal(sameNamespace.ok, false);
});

test('two callers have distinct fingerprints; repeating a caller is stable', async () => {
  const a = createIdentityProbe(config, () => wxIdentity());
  const b = createIdentityProbe(config, () => wxIdentity('synthetic-user-b'));
  const first = await a(command, context());
  const second = await b(command, context('synthetic-user-b'));
  assert.equal(first.ok && second.ok && first.data.callerFingerprint !== second.data.callerFingerprint, true);
  assert.deepEqual(await a(command, context()), first);
});

test('legacy context works without process fallback; malformed context is rejected', () => {
  const legacy = { ...context(), environment: undefined, environ: `WX_APPID=${config.appId};WX_OPENID=synthetic-user-a;TCB_ENV=${config.envId}` };
  assert.equal(readInvocationIdentity(legacy, config).openId, 'synthetic-user-a');
  for (const environment of ['broken-json', 'null', '[]', '{}']) {
    assert.throws(() => readInvocationIdentity({ ...context(), environment }, config));
  }
});

test('normal application transport never calls the internal probe', async () => {
  let invoked = false;
  const call = createCloudClient({ callFunction: async () => { invoked = true; return {}; } }, config.envId);
  await assert.rejects(call('p0Internal', command), { code: 'INVALID_REQUEST' });
  assert.equal(invoked, false);
});
