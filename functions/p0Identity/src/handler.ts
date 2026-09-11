import { createHash } from 'node:crypto';
import { AppError, isRecord, parseCommand, toErrorResponse, type Response } from '../../../packages/contracts/src/index';
import { readInvocationIdentity, type ProbeConfig } from '../../../packages/cloudbase/src/invocation';
import { identityDiagnostics } from './diagnostics';

interface WxIdentity { OPENID?: string; APPID?: string; ENV?: string }
interface ProbeResult { callerFingerprint: string; environmentMatched: true; sdkIdentityMatched: true }
export function createIdentityProbe(config: ProbeConfig, getWxIdentity: () => WxIdentity) {
  return async function probe(event: unknown, context: unknown): Promise<Response<ProbeResult> & { diagnostics?: ReturnType<typeof identityDiagnostics> }> {
    let requestId = 'invalid-request';
    try {
      // wx.cloud may attach userInfo outside the business envelope. Discard only
      // that transport field; NEVER use its values as caller identity. Retain
      // every other field so parseCommand still rejects unexpected input.
      const envelope = isRecord(event) && Object.hasOwn(event, 'userInfo')
        ? Object.fromEntries(Object.entries(event).filter(([key]) => key !== 'userInfo'))
        : event;
      const command = parseCommand(envelope);
      requestId = command.requestId;
      if (command.action !== 'probeIdentity' || Object.keys(command.payload).length !== 0) throw new AppError('INVALID_REQUEST');
      // Reject absent request identity BEFORE consulting the environment-backed WeChat SDK.
      const caller = readInvocationIdentity(context, config);
      const wxIdentity = getWxIdentity();
      if (wxIdentity.APPID !== caller.appId || wxIdentity.OPENID !== caller.openId || wxIdentity.ENV !== caller.envId) throw new AppError('UNAUTHENTICATED');
      const callerFingerprint = createHash('sha256').update(JSON.stringify(['p0-identity-v1', caller.envId, caller.appId, caller.openId])).digest('hex');
      // Identity presence is not business authorization. This probe grants no roles or data access.
      return { ok: true, requestId, data: { callerFingerprint, environmentMatched: true, sdkIdentityMatched: true } };
    } catch (error) {
      return { ...toErrorResponse(requestId, error), diagnostics: identityDiagnostics(event, context, config) };
    }
  };
}
