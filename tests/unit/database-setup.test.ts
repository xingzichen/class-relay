import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planP0DatabaseSetup, p0DatabaseSchema, type CollectionSnapshot } from '../../packages/cloudbase/src/database-setup';

test('empty database plans permission denial before indexes or any seed work', () => {
  const plan = planP0DatabaseSetup([]);
  assert.equal(plan.filter(item => item.kind === 'createCollection').length, 2);
  for (const schema of p0DatabaseSchema.collections) {
    const actions = plan.filter(item => item.collection === schema.name);
    assert.deepEqual(actions.map(item => item.kind), ['createCollection', 'denyClientAccess', 'createIndex']);
  }
});

test('already configured collections produce no changes; unrelated resources are preserved', () => {
  const snapshot: CollectionSnapshot[] = p0DatabaseSchema.collections.map(item => ({ name: item.name, permissions: { read: false, write: false }, indexes: structuredClone(item.indexes) }));
  snapshot.push({ name: 'unrelated', permissions: null, indexes: [] });
  assert.deepEqual(planP0DatabaseSetup(snapshot), []);
  snapshot[0]!.permissions = { read: true, write: false };
  assert.deepEqual(planP0DatabaseSetup(snapshot).map(item => item.kind), ['denyClientAccess']);
});

test('unknown permission state fails closed; incompatible indexes never trigger deletion', () => {
  const schema = p0DatabaseSchema.collections[0]!;
  const existing: CollectionSnapshot = { name: schema.name, permissions: null, indexes: [] };
  assert.equal(planP0DatabaseSetup([existing])[0]?.kind, 'denyClientAccess');
  existing.indexes = [{ ...schema.indexes[0]!, unique: true }];
  assert.throws(() => planP0DatabaseSetup([existing]), { code: 'INVALID_CONFIG' });
  assert.throws(() => planP0DatabaseSetup([existing, existing]), { code: 'INVALID_CONFIG' });
  assert.throws(() => planP0DatabaseSetup({} as CollectionSnapshot[]), { code: 'INVALID_CONFIG' });
});
