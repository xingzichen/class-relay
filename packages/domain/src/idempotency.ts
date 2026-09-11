import { createHash } from 'node:crypto';
import { AppError, isRecord, parseCommand } from '../../contracts/src/index';
export function canonicalJson(value: unknown): string {
  const active = new Set<object>();
  function visit(input: unknown, depth: number): string {
    if (depth > 32) throw new AppError('INVALID_REQUEST');
    if (input === null || typeof input === 'boolean' || typeof input === 'string') return JSON.stringify(input);
    if (typeof input === 'number' && Number.isFinite(input)) return JSON.stringify(input);
    if (typeof input !== 'object' || input === null || active.has(input)) throw new AppError('INVALID_REQUEST');
    active.add(input);
    try {
      if (Array.isArray(input)) {
        const values: string[] = [];
        for (let i = 0; i < input.length; i++) {
          if (!Object.hasOwn(input, i)) throw new AppError('INVALID_REQUEST');
          values.push(visit(input[i], depth + 1));
        }
        return '[' + values.join(',') + ']';
      }
      if (!isRecord(input) || Object.getOwnPropertySymbols(input).length) throw new AppError('INVALID_REQUEST');
      return '{' + Object.keys(input).sort().map(key => JSON.stringify(key) + ':' + visit(input[key], depth + 1)).join(',') + '}';
    } finally { active.delete(input); }
  }
  return visit(value, 0);
}
function sha256(value: string): string { return createHash('sha256').update(value, 'utf8').digest('hex'); }
export function stableId(namespace: string, parts: readonly string[]): string {
  if (!/^[a-z][a-z0-9_]{0,31}$/.test(namespace) || parts.length === 0 || parts.some(part => typeof part !== 'string' || !part.trim())) throw new AppError('INVALID_REQUEST');
  return namespace + '_' + sha256(canonicalJson(parts));
}
export function requestDigest(functionName: string, input: unknown): string {
  const command = parseCommand(input);
  if (!/^[a-z][a-zA-Z0-9]{0,63}$/.test(functionName)) throw new AppError('INVALID_REQUEST');
  return sha256(canonicalJson({ functionName, action: command.action, payload: command.payload }));
}
export type RequestRecord = { key: string; digest: string; state: 'PROCESSING' } | { key: string; digest: string; state: 'COMPLETED'; result: unknown };
export type IdempotencyPlan = { key: string; digest: string; kind: 'NEW' } | { key: string; digest: string; kind: 'REPLAY'; result: unknown };
/** userId must come from current server authentication. Read/create the record in the SAME business transaction. Re-authorize before replay. No external effects are executed here. */
export function planIdempotency(userId: string, functionName: string, input: unknown, existing?: RequestRecord): IdempotencyPlan {
  const command = parseCommand(input);
  const key = stableId('request', [userId, functionName, command.requestId]);
  const digest = requestDigest(functionName, command);
  if (!existing) return { key, digest, kind: 'NEW' };
  if (existing.key !== key || existing.digest !== digest) throw new AppError('IDEMPOTENCY_CONFLICT');
  if (existing.state === 'PROCESSING') throw new AppError('REQUEST_IN_PROGRESS');
  return { key, digest, kind: 'REPLAY', result: existing.result };
}
