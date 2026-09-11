import { AppError } from './errors';
import { isRecord } from './request';
export interface PublicConfig { readonly stage: 'development' | 'production'; readonly appId: string; readonly envId: string }
export function resolveConfig(stage: unknown, mappings: unknown): PublicConfig {
  if ((stage !== 'development' && stage !== 'production') || !isRecord(mappings) || Object.keys(mappings).some(key => key !== 'development' && key !== 'production')) throw new AppError('INVALID_CONFIG');
  const selected = mappings[stage];
  if (!isRecord(selected) || Object.keys(selected).length !== 2 ||
      typeof selected.appId !== 'string' || !/^wx[0-9a-f]{16}$/.test(selected.appId) ||
      typeof selected.envId !== 'string' || !/^[a-z][a-z0-9-]{2,100}$/.test(selected.envId)) throw new AppError('INVALID_CONFIG');
  const other = mappings[stage === 'development' ? 'production' : 'development'];
  if (isRecord(other) && other.envId === selected.envId) throw new AppError('INVALID_CONFIG');
  return Object.freeze({ stage, appId: selected.appId, envId: selected.envId });
}
