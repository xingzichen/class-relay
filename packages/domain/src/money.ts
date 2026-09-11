import { AppError } from '../../contracts/src/errors';
function checkedFen(value: number): number {
  if (!Number.isSafeInteger(value)) throw new AppError('INVALID_REQUEST');
  return value;
}
export function parseYuanToFen(value: string): number {
  if (typeof value !== 'string' || value.length > 32 || !/^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/.test(value)) throw new AppError('INVALID_REQUEST');
  const [whole, fraction = ''] = value.split('.');
  return checkedFen(Number(BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, '0'))));
}
export function formatFen(value: number): string {
  checkedFen(value);
  const integer = BigInt(value); const absolute = integer < 0n ? -integer : integer;
  return (integer < 0n ? '-' : '') + (absolute / 100n) + '.' + String(absolute % 100n).padStart(2, '0');
}
export function sumFen(values: readonly number[]): number {
  const sum = values.reduce((total, amount) => total + BigInt(checkedFen(amount)), 0n);
  return checkedFen(Number(sum));
}
