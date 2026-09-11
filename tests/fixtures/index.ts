import { AppError, assertVersion, nextVersion } from '../../packages/contracts/src/index';
import { utcInstant } from '../../packages/domain/src/time';
import type { Clock, Repository, Transaction, VersionedDocument } from '../../packages/domain/src/ports';
export class FixedClock implements Clock {
  private instant: string;
  constructor(value: string) { this.instant = utcInstant(value); }
  now(): string { return this.instant; }
  advance(milliseconds: number): void {
    if (!Number.isSafeInteger(milliseconds) || milliseconds < 0) throw new AppError('INVALID_REQUEST');
    this.instant = utcInstant(new Date(Date.parse(this.instant) + milliseconds).toISOString());
  }
}
/** A serial transaction fake, NOT evidence for CloudBase isolation, capacity or security. */
export class MemoryRepository<T extends VersionedDocument> implements Repository<T> {
  private rows = new Map<string, T>();
  private tail: Promise<void> = Promise.resolve();
  async get(id: string): Promise<T | undefined> { return structuredClone(this.rows.get(id)); }
  async transaction<R>(work: (tx: Transaction<T>) => Promise<R>): Promise<R> {
    const previous = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>(resolve => { release = resolve; });
    await previous;
    const draft = structuredClone(this.rows);
    let active = true;
    const ensureActive = () => { if (!active) throw new AppError('INVALID_STATE'); };
    const tx: Transaction<T> = {
      get: async id => { ensureActive(); return structuredClone(draft.get(id)); },
      create: async document => {
        ensureActive();
        if (!document.id.trim() || draft.has(document.id)) throw new AppError('VERSION_CONFLICT');
        assertVersion(document.version, 1); draft.set(document.id, structuredClone(document));
      },
      replace: async (document, expectedVersion) => {
        ensureActive(); const previousRow = draft.get(document.id);
        if (!previousRow) throw new AppError('NOT_FOUND');
        assertVersion(previousRow.version, expectedVersion);
        assertVersion(document.version, nextVersion(expectedVersion)); draft.set(document.id, structuredClone(document));
      }
    };
    try { const result = await work(tx); this.rows = draft; return result; }
    finally { active = false; release(); }
  }
}
export function createFixtures() {
  return {
    classes: [{ id: 'class-a', name: '模拟甲班' }, { id: 'class-b', name: '模拟乙班' }],
    students: [
      { id: 'student-a1', classId: 'class-a', name: '模拟同名学生', gender: 'FEMALE', version: 1 },
      { id: 'student-a2', classId: 'class-a', name: '模拟同名学生', gender: 'UNSPECIFIED', version: 1 },
      { id: 'student-b1', classId: 'class-b', name: '模拟乙班学生', gender: 'MALE', version: 1 }
    ],
    users: [
      { id: 'admin', role: 'SYSTEM_ADMIN', scope: 'GLOBAL' },
      { id: 'teacher-a', role: 'TEACHER', scope: 'class-a' },
      { id: 'committee-a', role: 'COMMITTEE', scope: 'class-a' },
      { id: 'parent-a', role: 'PARENT', scope: 'class-a' },
      { id: 'relative-a2', role: 'PARENT', scope: 'class-a' },
      { id: 'relative-a3', role: 'PARENT', scope: 'class-a' },
      { id: 'parent-b', role: 'PARENT', scope: 'class-b' },
      { id: 'delegate-a', role: 'PARENT', scope: 'class-a', capabilities: ['task.manage'] }
    ],
    links: [
      { userId: 'parent-a', studentId: 'student-a1', status: 'ACTIVE' },
      { userId: 'parent-a', studentId: 'student-a2', status: 'ACTIVE' },
      { userId: 'relative-a2', studentId: 'student-a1', status: 'ACTIVE' },
      { userId: 'relative-a3', studentId: 'student-a1', status: 'ACTIVE' },
      { userId: 'parent-b', studentId: 'student-b1', status: 'ACTIVE' }
    ]
  };
}
