import { AppError, isRecord } from '../../contracts/src/index';
import { canonicalJson } from '../../domain/src/idempotency';

export type DatabaseIndex = { name: string; unique: boolean; keys: { field: string; direction: 1 | -1 }[] };
export type CollectionSnapshot = { name: string; permissions: { read: unknown; write: unknown } | null; indexes: DatabaseIndex[] };
export type SetupOperation = { collection: string } & (
  { kind: 'createCollection' } | { kind: 'denyClientAccess'; permissions: { read: false; write: false } } |
  { kind: 'createIndex'; index: DatabaseIndex }
);

// PoC collections only. Business collections are introduced with their domain tasks.
export const p0DatabaseSchema: { version: number; collections: { name: string; indexes: DatabaseIndex[] }[] } = {
  version: 1,
  collections: [
    { name: 'p0_atomic_records', indexes: [{ name: 'class_status_id', unique: false, keys: [
      { field: 'class_id', direction: 1 }, { field: 'status', direction: 1 }, { field: '_id', direction: 1 }
    ] }] },
    { name: 'p0_atomic_events', indexes: [{ name: 'run_id_document_id', unique: false, keys: [
      { field: 'run_id', direction: 1 }, { field: '_id', direction: 1 }
    ] }] }
  ]
};

/** Pure preview, never an executor. Snapshot must come from trusted management
 * reads. Apply permission denial and read it back BEFORE inserting any test data.
 * Unsupported permission tooling is a blocking manual step, not a skipped step.
 */
export function planP0DatabaseSetup(snapshot: readonly CollectionSnapshot[]): SetupOperation[] {
  if (!Array.isArray(snapshot)) throw new AppError('INVALID_CONFIG');
  const current = new Map<string, CollectionSnapshot>();
  for (const item of snapshot) {
    if (!isRecord(item) || typeof item.name !== 'string' || !item.name || !Array.isArray(item.indexes) ||
        (item.permissions !== null && (!isRecord(item.permissions) || !Object.hasOwn(item.permissions, 'read') || !Object.hasOwn(item.permissions, 'write'))) ||
        current.has(item.name)) throw new AppError('INVALID_CONFIG');
    const names = new Set<string>();
    for (const index of item.indexes) {
      if (!isRecord(index) || typeof index.name !== 'string' || names.has(index.name) || typeof index.unique !== 'boolean' ||
          !Array.isArray(index.keys) || index.keys.length === 0 || index.keys.some(key => !isRecord(key) || typeof key.field !== 'string' || ![1, -1].includes(key.direction as number))) throw new AppError('INVALID_CONFIG');
      names.add(index.name);
    }
    current.set(item.name, {
      name: item.name,
      permissions: item.permissions as CollectionSnapshot['permissions'],
      indexes: item.indexes as DatabaseIndex[]
    });
  }
  const operations: SetupOperation[] = [];
  for (const desired of p0DatabaseSchema.collections) {
    const collection = desired.name;
    const existing = current.get(collection);
    if (!existing) operations.push({ kind: 'createCollection', collection });
    if (existing?.permissions?.read !== false || existing.permissions.write !== false) {
      operations.push({ kind: 'denyClientAccess', collection, permissions: { read: false, write: false } });
    }
    for (const index of desired.indexes) {
      const installed = existing?.indexes.find(item => item.name === index.name);
      if (!installed) operations.push({ kind: 'createIndex', collection, index: structuredClone(index) });
      else if (canonicalJson(installed) !== canonicalJson(index)) throw new AppError('INVALID_CONFIG');
    }
  }
  return operations;
}
