import { AppError, assertVersion, isRecord, nextVersion } from '../../contracts/src/index';
import { canonicalJson } from '../../domain/src/idempotency';

export type AtomicWrite = {
  collection: string;
  id: string;
  data: Record<string, unknown>;
} & ({ kind: 'create' } | { kind: 'replace'; expectedVersion: number; expectedStatus?: string });
export interface AtomicTransaction {
  collection(name: string): { doc(id: string): {
    get(): Promise<unknown>;
    set(data: Record<string, unknown>): Promise<unknown>;
  } };
}
export interface AtomicDatabase {
  runTransaction<T>(work: (transaction: AtomicTransaction) => Promise<T>, retries: number): Promise<T>;
}
// Application budget: at most 10 reads + 10 writes; not a measured platform limit.
export const MAX_ATOMIC_WRITES = 10;

function prepare(writes: readonly AtomicWrite[]): AtomicWrite[] {
  if (!Array.isArray(writes) || writes.length === 0 || writes.length > MAX_ATOMIC_WRITES) throw new AppError('INVALID_REQUEST');
  // Snapshot before the first await so caller mutation cannot change a retry.
  const snapshot: unknown = JSON.parse(canonicalJson(writes));
  if (!Array.isArray(snapshot)) throw new AppError('INVALID_REQUEST');
  const seen = new Set<string>();
  for (const write of snapshot) {
    if (!isRecord(write) || typeof write.collection !== 'string' || !/^[a-z][a-z0-9_]{0,63}$/.test(write.collection) ||
        typeof write.id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(write.id) || !isRecord(write.data)) throw new AppError('INVALID_REQUEST');
    const allowed = write.kind === 'create' ? ['collection', 'id', 'kind', 'data'] : ['collection', 'id', 'kind', 'data', 'expectedVersion', 'expectedStatus'];
    if (Object.keys(write).some(key => !allowed.includes(key)) || Object.hasOwn(write.data, '_id') || Object.hasOwn(write.data, '_openid')) throw new AppError('INVALID_REQUEST');
    const key = `${write.collection}/${write.id}`;
    if (seen.has(key)) throw new AppError('INVALID_REQUEST');
    seen.add(key);
    if (write.kind === 'create') {
      if (write.data.version !== 1) throw new AppError('INVALID_REQUEST');
    } else if (write.kind === 'replace') {
      if (typeof write.expectedVersion !== 'number' || write.data.version !== nextVersion(write.expectedVersion) ||
          (Object.hasOwn(write, 'expectedStatus') && (typeof write.expectedStatus !== 'string' || !write.expectedStatus.trim()))) throw new AppError('INVALID_REQUEST');
    } else throw new AppError('INVALID_REQUEST');
  }
  return snapshot as AtomicWrite[];
}

function sdkResult(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new AppError('INVALID_RESPONSE');
  // Preserve the SDK conflict code so runTransaction can retry. The function
  // boundary must sanitize other SDK details with toErrorResponse.
  if (Object.hasOwn(value, 'code')) throw value;
  return value;
}

/** Server-only primitive. Callers must authorize the entire plan before use.
 * No network side effects or caller callbacks are accepted inside the transaction.
 * This adapter targets the locked Node SDK transaction doc.get/doc.set shapes.
 */
export async function applyAtomicBatch(database: AtomicDatabase, writes: readonly AtomicWrite[]): Promise<{ written: number }> {
  const prepared = prepare(writes);
  return database.runTransaction(async transaction => {
    for (const write of prepared) {
      const document = transaction.collection(write.collection).doc(write.id);
      const current = sdkResult(await document.get()).data;
      if (current !== null && !isRecord(current)) throw new AppError('INVALID_RESPONSE');
      if (write.kind === 'create') {
        if (current !== null) throw new AppError('VERSION_CONFLICT');
      } else {
        if (current === null) throw new AppError('VERSION_CONFLICT');
        if (typeof current.version !== 'number' || !Number.isSafeInteger(current.version) || current.version < 1) throw new AppError('INVALID_RESPONSE');
        assertVersion(current.version, write.expectedVersion);
        if (write.expectedStatus !== undefined && current.status !== write.expectedStatus) throw new AppError('INVALID_STATE');
      }
      const result = sdkResult(await document.set(structuredClone(write.data)));
      const acknowledged = write.kind === 'replace' ? result.updated === 1 :
        result.updated === 0 && Array.isArray(result.upserted) && result.upserted.length === 1 &&
        isRecord(result.upserted[0]) && result.upserted[0]._id === write.id;
      if (!acknowledged) throw new AppError('INVALID_RESPONSE');
    }
    return { written: prepared.length };
  }, 2);
}
