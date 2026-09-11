import { AppError } from './errors';
export interface Command { action: string; payload: Record<string, unknown>; requestId: string }
export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}
export function parseCommand(value: unknown): Command {
  if (!isRecord(value) || Object.keys(value).length !== 3 || !Object.hasOwn(value, 'action') || !Object.hasOwn(value, 'payload') || !Object.hasOwn(value, 'requestId') ||
      typeof value.action !== 'string' || !/^[a-zA-Z][a-zA-Z0-9]{0,63}$/.test(value.action) ||
      typeof value.requestId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(value.requestId) || !isRecord(value.payload)) throw new AppError('INVALID_REQUEST');
  return { action: value.action, payload: value.payload, requestId: value.requestId };
}
