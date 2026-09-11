import { AppError, parseCommand, toErrorResponse } from '../../../packages/contracts/src/index';

/** Gateway reachability marker only. invoke:false MUST be installed before deployment.
 * No business data, runtime context or privileged action belongs in this diagnostic function.
 * A management call can reach it; a direct wx.cloud call must be denied by the gateway.
 */
export async function main(event: unknown) {
  let requestId = 'invalid-request';
  try {
    const command = parseCommand(event); requestId = command.requestId;
    if (command.action !== 'probeInternal' || Object.keys(command.payload).length !== 0) throw new AppError('INVALID_REQUEST');
    return { ok: true, requestId, data: { marker: 'p0-internal-reached' } };
  } catch (error) { return toErrorResponse(requestId, error); }
}
