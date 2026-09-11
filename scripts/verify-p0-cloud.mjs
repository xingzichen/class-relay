import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

// Explicit opt-in command: management-plane checks, NOT real WeChat client acceptance.
let mappings = {};
try { mappings = JSON.parse(await readFile('config/environments.local.json', 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const deployment = JSON.parse(await readFile('cloudbaserc.json', 'utf8'));
const envId = deployment.envId;
assert.equal(typeof envId, 'string');
if (mappings.development) assert.equal(envId, mappings.development.envId, 'Development and deployment environments must match');
assert.notEqual(envId, mappings.production?.envId, 'Never run probes against production');
const identityConfigured = Boolean(deployment.functions.find(item => item.name === 'p0Identity')?.envVariables?.MINIPROGRAM_APP_ID);
const evidence = { task: 'P0-03', scope: 'management-plane-only', identityConfigured, executedAt: new Date().toISOString(), envId, checks: [] };

function cli(args) {
  const result = spawnSync('tcb', [...args, '-e', envId, '--json'], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, timeout: 60000 });
  if (result.error || result.status !== 0) throw new Error('CloudBase command failed; inspect locally. Raw SDK output is not echoed.');
  const start = result.stdout.indexOf('{');
  if (start < 0) throw new Error('CloudBase JSON response missing');
  return JSON.parse(result.stdout.slice(start)).data;
}
function record(name, requestId) { evidence.checks.push({ name, passed: true, platformRequestId: requestId }); }
function invoke(name, action, payload, validate) {
  const requestId = `p003-${randomUUID()}`;
  const response = cli(['fn', 'invoke', name, '-d', JSON.stringify({ action, payload, requestId })]);
  assert.equal(response.InvokeResult, 0);
  const result = JSON.parse(response.RetMsg);
  assert.equal(result.requestId, requestId);
  validate(result);
  return response.FunctionRequestId;
}
try {
  for (const name of ['p0Identity', 'p0Internal']) {
    const detail = cli(['fn', 'detail', name]);
    assert.equal(detail.Status, 'Active');
    assert.equal(detail.Runtime, 'Nodejs22.21');
    assert.equal(detail.Type, 'Event');
    assert.equal(detail.Namespace, envId);
    record(`${name}: Active / Event / Nodejs22.21 / development`, detail.RequestId);
  }
  const permission = cli(['api', 'tcb', 'DescribeResourcePermission', '--api-version', '2018-06-08', '--body', JSON.stringify({ EnvId: envId, ResourceType: 'function' })]);
  const rules = JSON.parse(permission.Data.PermissionList[0].SecurityRule);
  assert.equal(rules.p0Internal?.invoke, false);
  record('internal client permission is false', permission.RequestId);
  record('management invocation cannot impersonate WeChat', invoke('p0Identity', 'probeIdentity', {}, result => {
    assert.equal(result.ok, false); assert.equal(result.error.code, identityConfigured ? 'UNAUTHENTICATED' : 'INVALID_CONFIG');
  }));
  record('forged caller fields rejected on cloud', invoke('p0Identity', 'probeIdentity', { openid: 'synthetic-attacker', role: 'SYSTEM_ADMIN', internal: true }, result => {
    assert.equal(result.ok, false); assert.equal(result.error.code, 'INVALID_REQUEST');
  }));
  record('internal marker reachable with management credentials', invoke('p0Internal', 'probeInternal', {}, result => {
    assert.equal(result.ok, true); assert.equal(result.data.marker, 'p0-internal-reached');
  }));
  await mkdir('.local/p0', { recursive: true });
  await writeFile('.local/p0/management-verification.json', JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence, null, 2));
  console.log('Real WeChat identities, direct client denial and device acceptance remain separate checks.');
} catch {
  console.error('P0 cloud verification FAILED. No completion record written; inspect environment and function configuration.');
  process.exitCode = 1;
}
