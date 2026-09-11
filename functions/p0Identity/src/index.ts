import cloud from 'wx-server-sdk';
import { createIdentityProbe } from './handler';

// wx-server-sdk 4.0.2 declares DYNAMIC_CURRENT_ENV as symbol but omits symbol from init.env.
// Its runtime explicitly supports this sentinel. Keep this narrow check until upstream fixes types.
// @ts-expect-error Upstream init.env declaration excludes its own supported sentinel.
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
export const main = createIdentityProbe({
  appId: process.env.MINIPROGRAM_APP_ID ?? '',
  envId: process.env.CLOUDBASE_ENV_ID ?? ''
}, () => cloud.getWXContext());
