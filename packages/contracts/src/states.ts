import { AppError } from './errors';
export const ApplicationStatus = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;
export const MembershipStatus = ['PENDING', 'ACTIVE', 'SUSPENDED', 'LEFT'] as const;
export const RoleAssignmentStatus = ['PREPARED', 'ACTIVE', 'REVOKED'] as const;
export const GrantStatus = ['PREPARED', 'ACTIVE', 'REVOKED', 'EXPIRED'] as const;
export const ChildLinkStatus = ['ACTIVE', 'REVOKED'] as const;
export const Gender = ['MALE', 'FEMALE', 'UNSPECIFIED'] as const;
export const Roles = ['SYSTEM_ADMIN', 'TEACHER', 'COMMITTEE', 'PARENT'] as const;
export const TaskType = ['NOTICE', 'COLLECT', 'TODO'] as const;
export const TaskLifecycle = ['DRAFT', 'PUBLISHED', 'CLOSED', 'CANCELLED', 'ARCHIVED'] as const;
export const ReadScope = ['CLASS_PUBLIC', 'TARGET_PRIVATE'] as const;
export const CompletionMode = ['PER_STUDENT', 'PER_RELATIVE'] as const;
export const CompletionStatus = ['PENDING', 'COMPLETED', 'SUBMITTED', 'DECLARED', 'VERIFIED', 'WITHDRAWN'] as const;
export const CollectionMode = ['NATIVE_FORM', 'EXTERNAL_DOC'] as const;
export const EvidenceSource = ['NATIVE_FORM', 'EXTERNAL_SELF_REPORTED', 'ADMIN_RECORDED', 'EXTERNAL_VERIFIED'] as const;
export const DeliveryStatus = ['QUEUED', 'CLAIMED', 'API_ACCEPTED', 'RETRY_WAIT', 'BLOCKED', 'UNKNOWN', 'CANCELLED', 'SKIPPED'] as const;
export const EventType = ['INITIAL', 'REMINDER', 'CHANGE_NOTICE'] as const;
export const ActivityStatus = ['DRAFT', 'OPEN', 'FINISHED', 'CANCELLED', 'ARCHIVED'] as const;
export const VolunteerStatus = ['CONFIRMED', 'WAITLISTED', 'OFFERED', 'WITHDRAWN', 'OFFER_EXPIRED', 'CANCELLED', 'REVIEW_PENDING', 'NEEDS_INFO'] as const;
export const HandoverStatus = ['DRAFT', 'AWAITING_ACCEPTANCE', 'ACCEPTED', 'ACTIVE', 'CANCELLED'] as const;
export const ConsentStatus = ['PENDING', 'VERIFIED', 'REVOKED'] as const;
export const MaterialStatus = ['AVAILABLE', 'CLAIMED', 'RECEIVED', 'RETURNED'] as const;
export const FeeProjectStatus = ['DRAFT', 'OPEN', 'RECONCILING', 'CLOSED', 'CANCELLED', 'ARCHIVED'] as const;
export const CashRecordStatus = ['DRAFT', 'SUBMITTED', 'VERIFIED_POSTED', 'REJECTED'] as const;
export const PaymentClaimStatus = ['PENDING', 'NEEDS_INFO', 'MATCHED', 'REJECTED'] as const;
export const PublicationStatus = ['GENERATING', 'READY', 'PUBLISHED'] as const;
export const QaJobStatus = ['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'EXPIRED'] as const;
export function parseEnum<const T extends readonly string[]>(values: T, value: unknown): T[number] {
  if (typeof value !== 'string' || !values.includes(value)) throw new AppError('INVALID_STATE');
  return value;
}
export function assertTransition<const T extends readonly string[]>(values: T, from: unknown, to: unknown, transitions: Partial<Record<T[number], readonly T[number][]>>): void {
  const current = parseEnum(values, from); const next = parseEnum(values, to);
  if (!transitions[current]?.includes(next)) throw new AppError('INVALID_STATE');
}
export function assertVersion(current: number, expected: number): void {
  if (!Number.isSafeInteger(current) || current < 1 || !Number.isSafeInteger(expected) || expected < 1) throw new AppError('INVALID_REQUEST');
  if (current !== expected) throw new AppError('VERSION_CONFLICT');
}
export function nextVersion(current: number): number {
  assertVersion(current, current);
  if (current === Number.MAX_SAFE_INTEGER) throw new AppError('INVALID_REQUEST');
  return current + 1;
}
