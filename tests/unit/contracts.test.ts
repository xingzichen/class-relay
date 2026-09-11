import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCommand, parseEnum, TaskLifecycle, assertVersion, nextVersion, assertTransition, ApplicationStatus, toErrorResponse } from '../../packages/contracts/src/index';
test('request schema requires exactly action/payload/requestId', () => {
  const good = { action: 'publish', payload: { version: 1 }, requestId: 'req-1' };
  assert.deepEqual(parseCommand(good), good);
  for (const bad of [null, [], { ...good, requestId: '' }, { ...good, action: ' ' }, { ...good, payload: [] }, { ...good, role: 'ADMIN' }, { ...good, requestId: 'x'.repeat(129) }]) assert.throws(() => parseCommand(bad));
});
test('illegal states and stale versions cannot silently advance', () => {
  assert.equal(parseEnum(TaskLifecycle, 'PUBLISHED'), 'PUBLISHED');
  assert.throws(() => parseEnum(TaskLifecycle, 'OVERDUE'));
  assert.throws(() => assertVersion(3, 2));
  for (const value of [0, -1, 1.1, NaN, Infinity]) assert.throws(() => assertVersion(value, value));
  assert.equal(nextVersion(2), 3); assert.throws(() => nextVersion(Number.MAX_SAFE_INTEGER));
});
test('application terminal state cannot be overwritten', () => {
  assertTransition(ApplicationStatus, 'PENDING', 'APPROVED', { PENDING: ['APPROVED', 'REJECTED', 'CANCELLED'] });
  assert.throws(() => assertTransition(ApplicationStatus, 'APPROVED', 'REJECTED', { PENDING: ['APPROVED', 'REJECTED', 'CANCELLED'] }));
  assert.throws(() => assertTransition(ApplicationStatus, 'PENDING', 'BOGUS', { PENDING: ['APPROVED'] }));
});
test('unexpected errors do not leak secrets, stack or raw input', () => {
  const result = toErrorResponse('req-1', new Error('SECRET / database details'));
  assert.deepEqual(result, { ok: false, requestId: 'req-1', error: { code: 'INTERNAL_ERROR', message: '服务暂时不可用，请稍后重试。' } });
});
