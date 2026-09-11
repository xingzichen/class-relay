/* global wx */
// Execute this function in the REAL WeChat runtime via automation_evaluate --fn-source.
// Supply the authorized development envId as the sole argument; never mock wx.cloud.
async function verifyWechatIdentity(envId) {
  if (!/^[a-z][a-z0-9-]{2,100}$/.test(envId)) throw new Error('Invalid development environment');
  const checks = [];
  async function invoke(name, action, payload, suffix) {
    const requestId = `p003-wx-${Date.now()}-${suffix}`;
    const response = await wx.cloud.callFunction({ name, config: { env: envId }, data: { action, payload, requestId } });
    if (!response.result || response.result.requestId !== requestId) throw new Error('Response envelope mismatch');
    return response.result;
  }
  const first = await invoke('p0Identity', 'probeIdentity', {}, 'first');
  if (!first.ok || !/^[a-f0-9]{64}$/.test(first.data.callerFingerprint) || !first.data.environmentMatched || !first.data.sdkIdentityMatched) throw new Error('Native identity verification failed');
  checks.push('native identity accepted');
  const forged = await invoke('p0Identity', 'probeIdentity', { openid: 'synthetic-attacker', internal: true, role: 'SYSTEM_ADMIN' }, 'forged');
  if (forged.ok || forged.error.code !== 'INVALID_REQUEST') throw new Error('Forged caller was not rejected');
  checks.push('forged input rejected');
  let denied = false;
  try { await invoke('p0Internal', 'probeInternal', {}, 'internal'); }
  catch (error) {
    // A timeout, missing function or generic failure must NOT count as a permission rejection.
    denied = /EXCEED_AUTHORITY|ACTION_FORBIDDEN|PERMISSION_DENIED|(-?501003)|(-?502003)/.test(String(error && (error.errMsg || error.message || error.code)));
  }
  if (!denied) throw new Error('Internal client denial has not been proven');
  checks.push('direct internal entry rejected by gateway');
  const repeat = await invoke('p0Identity', 'probeIdentity', {}, 'repeat');
  if (!repeat.ok || repeat.data.callerFingerprint !== first.data.callerFingerprint) throw new Error('Caller identity changed');
  checks.push('same caller stable across invocations');
  return { scope: 'single-wechat-account', checks, callerFingerprint: first.data.callerFingerprint };
}
// This file is an executable function source for the IDE, not a Node.js integration test.
// A second authorized real account and real-device runs are still required by P0-03.
void verifyWechatIdentity;
