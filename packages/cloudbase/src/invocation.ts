import { parseContext, type IContextParam } from '@cloudbase/node-sdk';
import { AppError, isRecord } from '../../contracts/src/index';

export interface ProbeConfig { appId: string; envId: string }
/** Only pass SCF's second handler argument. Never pass event.context or process.env. */
export function readInvocationIdentity(context: unknown, config: ProbeConfig) {
  if (!/^wx[a-f0-9]{16}$/.test(config.appId) || !/^[a-z][a-z0-9-]{2,100}$/.test(config.envId)) throw new AppError('INVALID_CONFIG');
  if (!isRecord(context) || context.namespace !== config.envId) throw new AppError('UNAUTHENTICATED');
  let environment: unknown;
  try {
    // parseContext reads ONLY this request. getCloudbaseContext would also fall back to process.env.
    const parsed = parseContext(context as unknown as IContextParam);
    environment = parsed.environment ?? parsed.environ;
  } catch { throw new AppError('UNAUTHENTICATED'); }
  if (!isRecord(environment) || environment.TCB_ENV !== config.envId || environment.WX_APPID !== config.appId ||
      typeof environment.WX_OPENID !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(environment.WX_OPENID)) throw new AppError('UNAUTHENTICATED');
  return Object.freeze({ appId: config.appId, openId: environment.WX_OPENID, envId: config.envId });
}
