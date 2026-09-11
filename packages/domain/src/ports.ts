/** Current instant must be canonical UTC. Scheduling uses Asia/Shanghai separately. */
export interface Clock { now(): string }
export interface VersionedDocument { id: string; version: number }
export interface Transaction<T extends VersionedDocument> {
  get(id: string): Promise<T | undefined>;
  create(document: T): Promise<void>;
  replace(document: T, expectedVersion: number): Promise<void>;
}
/** CloudBase implementation and real transaction tests are P0-04 work. */
export interface Repository<T extends VersionedDocument> {
  get(id: string): Promise<T | undefined>;
  transaction<R>(work: (tx: Transaction<T>) => Promise<R>): Promise<R>;
}
export interface WechatSender {
  send(request: { recipientId: string; templateId: string; data: Record<string, string>; attemptToken: string }): Promise<{ kind: 'API_ACCEPTED' } | { kind: 'BLOCKED' | 'RETRYABLE_FAILURE' | 'UNKNOWN'; code: string }>;
}
export interface ModelGateway {
  generate(request: { modelId: string; system: string; question: string; sources: readonly { ref: string; text: string }[]; maxOutputTokens: number }): Promise<{ text: string; inputTokens: number; outputTokens: number }>;
}
