import { AppError, isErrorCode, isRecord, parseCommand } from '../../../packages/contracts/src/index';
export interface CloudTransport {
  callFunction(input: { name: string; data: { action: string; payload: Record<string, unknown>; requestId: string }; config: { env: string } }): Promise<{ result?: unknown }>;
}
const publicFunctions = new Set(['bootstrap', 'identity', 'membership', 'students', 'family', 'groups', 'tasks', 'completion', 'knowledge', 'qa', 'aiAdmin', 'files', 'forms', 'activities', 'volunteers', 'handover', 'finance', 'consent', 'materials', 'preferences', 'schedules']);
export function createCloudClient(transport: CloudTransport, envId: string) {
  if (!/^[a-z][a-z0-9-]{2,100}$/.test(envId)) throw new AppError('INVALID_CONFIG');
  return async function call<T = unknown>(name: string, input: unknown): Promise<T> {
    const command = parseCommand(input);
    if (!publicFunctions.has(name) || ['env', 'envId', 'internal', 'openid', 'appid', 'role', 'is_admin'].some(key => Object.hasOwn(command.payload, key))) throw new AppError('INVALID_REQUEST');
    let response: { result?: unknown };
    try { response = await transport.callFunction({ name, data: command, config: { env: envId } }); }
    catch { throw new AppError('NETWORK_ERROR'); }
    const result = response?.result;
    if (!isRecord(result) || result.requestId !== command.requestId) throw new AppError('INVALID_RESPONSE');
    if (result.ok === true && Object.hasOwn(result, 'data')) return result.data as T;
    if (result.ok === false && isRecord(result.error) && isErrorCode(result.error.code)) throw new AppError(result.error.code);
    throw new AppError('INVALID_RESPONSE');
  };
}
