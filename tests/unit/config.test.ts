import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveConfig } from '../../packages/contracts/src/config';
const mapping = {
  development: { appId: 'wx1111111111111111', envId: 'fixture-dev' },
  production: { appId: 'wx2222222222222222', envId: 'fixture-prod' }
};
test('only the requested build stage enters the public config', () => {
  assert.deepEqual(resolveConfig('development', mapping), { stage: 'development', ...mapping.development });
  assert.equal(JSON.stringify(resolveConfig('development', mapping)).includes('fixture-prod'), false);
});
test('missing, invalid, placeholder or extra configuration is rejected', () => {
  for (const stage of ['', 'test', undefined]) assert.throws(() => resolveConfig(stage, mapping));
  for (const bad of [null, {}, { development: {} }, { development: { appId: 'touristappid', envId: 'fixture-dev' } }, { development: { appId: mapping.development.appId, envId: '<ENV_ID>' } }, { development: { ...mapping.development, secretKey: 'never-ship' } }]) {
    assert.throws(() => resolveConfig('development', bad));
  }
});
test('development and production may not share an environment', () => {
  assert.throws(() => resolveConfig('development', { ...mapping, production: { ...mapping.production, envId: mapping.development.envId } }));
});
test('configuration rejects unknown stages and does not retain mutable input references', () => {
  assert.throws(() => resolveConfig('development', { ...mapping, staging: mapping.development }));
  const copy = structuredClone(mapping); const config = resolveConfig('development', copy);
  copy.development.envId = 'different'; assert.equal(config.envId, 'fixture-dev');
});
