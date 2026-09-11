import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalJson, stableId, requestDigest, planIdempotency, type RequestRecord } from '../../packages/domain/src/idempotency';
import { parseYuanToFen, formatFen, sumFen } from '../../packages/domain/src/money';
import { utcInstant, shanghaiDate } from '../../packages/domain/src/time';
import { createFixtures, FixedClock, MemoryRepository } from '../fixtures/index';
const command = { action: 'save', payload: { amount: 5000, student: 'student-a1' }, requestId: 'req-1' };
test('canonical digest sorts object keys but preserves arrays and types', () => {
  assert.equal(requestDigest('finance', command), requestDigest('finance', { ...command, payload: { student: 'student-a1', amount: 5000 } }));
  assert.notEqual(canonicalJson([1,2]), canonicalJson([2,1]));
  assert.notEqual(canonicalJson({ a: '1' }), canonicalJson({ a: 1 }));
});
test('non-JSON and cyclic payloads cannot collapse to the same digest', () => {
  const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic;
  for (const bad of [undefined, NaN, Infinity, new Date(), 1n, cyclic, { a: undefined }, new Array(2)]) assert.throws(() => canonicalJson(bad));
});
test('stable composite IDs do not collide on separators, scope or empty keys', () => {
  assert.equal(stableId('receipt', ['u1','s1']), stableId('receipt', ['u1','s1']));
  assert.notEqual(stableId('receipt', ['a:b','c']), stableId('receipt', ['a','b:c']));
  assert.notEqual(stableId('receipt', ['u1','s1']), stableId('role', ['u1','s1']));
  for (const parts of [[], [''], ['   ']]) assert.throws(() => stableId('receipt', parts));
});
test('idempotency replays only same user/function/request and matching body', () => {
  const first = planIdempotency('u1', 'finance', command);
  const record: RequestRecord = { key: first.key, digest: first.digest, state: 'COMPLETED', result: { id: 'posted-1' } };
  assert.deepEqual(planIdempotency('u1','finance',command,record), { ...first, kind: 'REPLAY', result: { id: 'posted-1' } });
  assert.throws(() => planIdempotency('u1','finance',{ ...command, payload: { amount: 1 } },record));
  assert.notEqual(planIdempotency('u2','finance',command).key, first.key);
  assert.notEqual(planIdempotency('u1','tasks',command).key, first.key);
  assert.throws(() => planIdempotency('u2','finance',command,record));
});
test('in-flight request does not run again and action changes conflict', () => {
  const first = planIdempotency('u1','finance',command);
  assert.throws(() => planIdempotency('u1','finance',command,{ key: first.key, digest: first.digest, state: 'PROCESSING' }));
  assert.throws(() => planIdempotency('u1','finance',{ ...command, action: 'delete' },{ key: first.key, digest: first.digest, state: 'COMPLETED', result: {} }));
});
test('integer-fen arithmetic is exact, signed ledger balances stay signed', () => {
  assert.equal(parseYuanToFen('0.10'), 10); assert.equal(parseYuanToFen('50'), 5000);
  assert.equal(sumFen([200000,-60000,-30000,-10000]),100000);
  assert.equal(formatFen(-123), '-1.23'); assert.equal(formatFen(0), '0.00');
  assert.equal(sumFen([10,20]),30);
});
test('amounts reject rounding, exponents, negatives and overflow', () => {
  for (const amount of ['1.001','1e2','-1','NaN','','01',' 1','90071992547409.92']) assert.throws(() => parseYuanToFen(amount));
  for (const bad of [1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1]) assert.throws(() => formatFen(bad));
  assert.throws(() => sumFen([Number.MAX_SAFE_INTEGER,1]));
});
test('UTC validation and Shanghai dates handle midnight and invalid calendar dates', () => {
  assert.equal(utcInstant('2026-09-10T16:00:00Z'), '2026-09-10T16:00:00.000Z');
  assert.equal(shanghaiDate('2026-09-10T15:59:59Z'),'2026-09-10');
  assert.equal(shanghaiDate('2026-09-10T16:00:00Z'),'2026-09-11');
  for (const bad of ['2026-02-30T00:00:00Z','2026-09-10','2026-09-10T08:00:00+08:00','not-time']) assert.throws(() => utcInstant(bad));
});
test('test clock and multi-family fixtures are reset between tests', () => {
  const clock = new FixedClock('2026-09-10T15:59:59Z'); clock.advance(1000);
  assert.equal(clock.now(), '2026-09-10T16:00:00.000Z');
  const first=createFixtures(); first.students[0]!.name='changed';
  assert.notEqual(createFixtures().students[0]!.name, 'changed');
  const fixture=createFixtures();
  assert.equal(fixture.classes.length,2); assert.equal(fixture.students[0]!.name,fixture.students[1]!.name);
  assert.equal(fixture.links.filter(l => l.userId==='parent-a').length,2);
  assert.equal(fixture.links.filter(l => l.studentId==='student-a1').length,3);
  assert.equal(fixture.links.every(link => fixture.users.some(user => user.id === link.userId) && fixture.students.some(student => student.id === link.studentId)), true);
});
test('repository fake protects copies, unique create and optimistic version', async () => {
  const repo=new MemoryRepository<{ id: string; version: number; name: string }>();
  await repo.transaction(async tx => { await tx.create({ id:'x', version:1, name:'old' }); });
  const row=await repo.get('x'); row!.name='mutated'; assert.equal((await repo.get('x'))!.name,'old');
  await assert.rejects(repo.transaction(async tx => { await tx.create({ id:'x',version:1,name:'duplicate' }); }));
  await assert.rejects(repo.transaction(async tx => { await tx.replace({ id:'x',version:2,name:'wrong' },2); }));
});
test('repository fake rollback and concurrent version conflict are deterministic', async () => {
  const repo=new MemoryRepository<{ id:string; version:number }>();
  await assert.rejects(repo.transaction(async tx => { await tx.create({id:'rollback',version:1}); throw new Error('abort'); }));
  assert.equal(await repo.get('rollback'),undefined);
  await repo.transaction(async tx => { await tx.create({id:'x',version:1}); });
  const results=await Promise.allSettled([1,2].map(() => repo.transaction(async tx => { await tx.replace({id:'x',version:2},1); })));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal((await repo.get('x'))!.version,2);
});
