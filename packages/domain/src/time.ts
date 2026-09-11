import { AppError } from '../../contracts/src/errors';
export function utcInstant(value: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value)) throw new AppError('INVALID_REQUEST');
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new AppError('INVALID_REQUEST');
  const normalized = new Date(parsed).toISOString();
  if (normalized !== (value.includes('.') ? value : value.replace('Z', '.000Z'))) throw new AppError('INVALID_REQUEST');
  return normalized;
}
export function shanghaiDate(value: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(utcInstant(value)));
}
