import { isRecord } from '../../../packages/contracts/src/index';
import type { ProbeConfig } from '../../../packages/cloudbase/src/invocation';

function kind(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}
/** Development probe only: fixed labels and booleans, never values, key names,
 * context dumps, identifiers, tokens or process environment. Not authorization.
 */
export function identityDiagnostics(event: unknown, context: unknown, config: ProbeConfig) {
  const object = event !== null && typeof event === 'object' ? event as Record<string, unknown> : {};
  const fields = Object.keys(object);
  const ctx = isRecord(context) ? context : {};
  return {
    event: {
      kind: kind(event), plainRecord: isRecord(event), fieldCount: Math.min(fields.length, 100),
      unexpectedFields: Math.min(fields.filter(key => !['action', 'payload', 'requestId', 'userInfo'].includes(key)).length, 100),
      actionType: kind(object.action), payloadType: kind(object.payload), requestIdType: kind(object.requestId),
      userInfoPresent: Object.hasOwn(object, 'userInfo')
    },
    configuration: {
      appIdValid: /^wx[a-f0-9]{16}$/.test(config.appId),
      envIdValid: /^[a-z][a-z0-9-]{2,100}$/.test(config.envId)
    },
    context: {
      kind: kind(context), plainRecord: isRecord(context), namespaceMatches: ctx.namespace === config.envId,
      environmentType: kind(ctx.environment), environType: kind(ctx.environ)
    }
  };
}
