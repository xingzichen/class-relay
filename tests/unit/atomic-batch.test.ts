import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { init } from '@cloudbase/node-sdk';
import { applyAtomicBatch, type AtomicDatabase, type AtomicWrite, type AtomicTransaction } from '../../packages/cloudbase/src/atomic-batch';

// Compile-time integration with the installed SDK, without opening a connection.
type Assert<T extends true> = T;
export type SdkDatabaseCompatibility = Assert<ReturnType<ReturnType<typeof init>['database']> extends AtomicDatabase ? true : false>;

const create = (id: string): AtomicWrite => ({ collection: 'p0_atomic_records', id, kind: 'create', data: { version: 1, status: 'PENDING' } });
function database() {
  const rows = new Map<string, Record<string, unknown>>();
  let started = 0; let writes = 0;
  let beforeCommit: (() => void) | undefined;
  let failWrite = 0;
  const db: AtomicDatabase = {
    async runTransaction<T>(work: (tx: AtomicTransaction) => Promise<T>, retries: number): Promise<T> {
      started++;
      const draft = structuredClone(rows);
      const tx: AtomicTransaction = { collection: name => ({ doc: id => ({
        get: async () => ({ data: structuredClone(draft.get(`${name}/${id}`) ?? null) }),
        set: async data => {
          writes++;
          if (writes === failWrite) return { code: 'DATABASE_REQUEST_FAILED', message: 'private SDK detail' };
          const exists = draft.has(`${name}/${id}`);
          draft.set(`${name}/${id}`, structuredClone(data));
          return { updated: exists ? 1 : 0, upserted: exists ? [] : [{ _id: id }] };
        }
      }) }) };
      const result = await work(tx);
      if (beforeCommit && retries > 0) { const change = beforeCommit; beforeCommit = undefined; change(); return db.runTransaction(work, retries - 1); }
      rows.clear(); for (const [key, value] of draft) rows.set(key, value);
      return result;
    }
  };
  return { db, rows, get started() { return started; }, get writes() { return writes; }, conflict(change: () => void) { beforeCommit = change; }, failAt(n: number) { failWrite = n; } };
}

test('atomic create spans explicit document IDs and never overwrites duplicates', async () => {
  const fake = database();
  const result = await applyAtomicBatch(fake.db, [create('one'), { ...create('event'), collection: 'p0_atomic_events' }]);
  assert.equal(result.written, 2);
  assert.equal(fake.rows.size, 2);
  await assert.rejects(applyAtomicBatch(fake.db, [create('one')]), { code: 'VERSION_CONFLICT' });
  assert.equal(fake.rows.get('p0_atomic_records/one')?.status, 'PENDING');
});

test('replacement requires expected version and status; version advances exactly once', async () => {
  const fake = database(); await applyAtomicBatch(fake.db, [create('one')]);
  const replacement: AtomicWrite = { collection: 'p0_atomic_records', id: 'one', kind: 'replace', expectedVersion: 1, expectedStatus: 'PENDING', data: { version: 2, status: 'APPROVED' } };
  await applyAtomicBatch(fake.db, [replacement]);
  await assert.rejects(applyAtomicBatch(fake.db, [replacement]), { code: 'VERSION_CONFLICT' });
  await assert.rejects(applyAtomicBatch(fake.db, [{ ...replacement, expectedVersion: 2, data: { version: 3, status: 'REJECTED' } }]), { code: 'INVALID_STATE' });
  assert.equal(fake.rows.get('p0_atomic_records/one')?.status, 'APPROVED');
});

test('conflict retry rereads current data and cannot overwrite another terminal state', async () => {
  const fake = database(); await applyAtomicBatch(fake.db, [create('one')]);
  fake.conflict(() => fake.rows.set('p0_atomic_records/one', { version: 2, status: 'APPROVED' }));
  await assert.rejects(applyAtomicBatch(fake.db, [{ collection: 'p0_atomic_records', id: 'one', kind: 'replace', expectedVersion: 1, expectedStatus: 'PENDING', data: { version: 2, status: 'REJECTED' } }]), { code: 'VERSION_CONFLICT' });
  assert.equal(fake.rows.get('p0_atomic_records/one')?.status, 'APPROVED');
});

test('SDK error return triggers rollback of the entire batch', async () => {
  const fake = database(); fake.failAt(2);
  await assert.rejects(applyAtomicBatch(fake.db, [create('one'), create('two')]), { code: 'DATABASE_REQUEST_FAILED' });
  assert.equal(fake.rows.size, 0);
});

test('empty, excessive, duplicate and invalid batches are rejected before starting a transaction', async () => {
  const fake = database();
  for (const input of [[], Array.from({ length: 11 }, (_, i) => create(String(i))), [create('one'), create('one')], [{ ...create('one'), collection: '../other' }], [{ ...create('one'), data: { version: 0 } }], [{ ...create('one'), data: { version: 1, _openid: 'forged' } }], [{ ...create('one'), data: { version: 1, callback: () => undefined } }]]) {
    await assert.rejects(applyAtomicBatch(fake.db, input as AtomicWrite[]));
  }
  assert.equal(fake.started, 0);
});

test('JSON inputs are snapshotted before SDK retries; no caller callbacks run inside transaction', async () => {
  const fake = database(); const input = create('one');
  const operation = applyAtomicBatch(fake.db, [input]);
  input.data.status = 'MUTATED';
  await operation;
  assert.equal(fake.rows.get('p0_atomic_records/one')?.status, 'PENDING');
});

test('failed reads and missing write acknowledgements are not interpreted as empty/success', async () => {
  const db = (get: unknown, set: unknown): AtomicDatabase => ({ runTransaction: work => work({ collection: () => ({ doc: () => ({ get: async () => get, set: async () => set }) }) }) });
  await assert.rejects(applyAtomicBatch(db({ code: 'DATABASE_TRANSACTION_CONFLICT' }, {}), [create('one')]), { code: 'DATABASE_TRANSACTION_CONFLICT' });
  await assert.rejects(applyAtomicBatch(db({ data: [] }, {}), [create('one')]), { code: 'INVALID_RESPONSE' });
  await assert.rejects(applyAtomicBatch(db({ data: null }, { updated: 0 }), [create('one')]), { code: 'INVALID_RESPONSE' });
  const replacement: AtomicWrite = { collection: 'p0_atomic_records', id: 'one', kind: 'replace', expectedVersion: 1, data: { version: 2 } };
  await assert.rejects(applyAtomicBatch(db({ data: null }, {}), [replacement]), { code: 'VERSION_CONFLICT' });
  await assert.rejects(applyAtomicBatch(db({ data: { version: '1' } }, {}), [replacement]), { code: 'INVALID_RESPONSE' });
  await assert.rejects(applyAtomicBatch(db({ data: { version: 1 } }, { updated: 0 }), [replacement]), { code: 'INVALID_RESPONSE' });
  await assert.rejects(applyAtomicBatch(db({}, {}), [create('one')]), { code: 'INVALID_RESPONSE' });
});
