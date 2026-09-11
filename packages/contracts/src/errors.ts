export const errorMessages = {
  INVALID_REQUEST: '请求参数不正确。',
  INVALID_CONFIG: '环境配置尚未完成或不正确。',
  INVALID_RESPONSE: '服务响应不正确，请稍后重试。',
  UNAUTHENTICATED: '请先登录。',
  FORBIDDEN: '你没有此操作权限。',
  NOT_FOUND: '内容不存在或不可访问。',
  VERSION_CONFLICT: '内容已更新，请刷新后重试。',
  INVALID_STATE: '当前状态不允许此操作。',
  IDEMPOTENCY_CONFLICT: '请求编号已用于不同内容。',
  REQUEST_IN_PROGRESS: '请求正在处理中，请查询原请求结果。',
  NETWORK_ERROR: '网络调用未完成，请核对原请求结果。',
  NOT_READY: '此功能尚未接入。',
  INTERNAL_ERROR: '服务暂时不可用，请稍后重试。'
} as const;
export type ErrorCode = keyof typeof errorMessages;
export class AppError extends Error {
  constructor(readonly code: ErrorCode) { super(errorMessages[code]); this.name = 'AppError'; }
}
export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && Object.hasOwn(errorMessages, value);
}
export type Response<T> = { ok: true; requestId: string; data: T } | { ok: false; requestId: string; error: { code: ErrorCode; message: string } };
export function toErrorResponse(requestId: string, error: unknown): Response<never> {
  const code = error instanceof AppError ? error.code : 'INTERNAL_ERROR';
  return { ok: false, requestId, error: { code, message: errorMessages[code] } };
}
