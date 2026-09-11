import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Readiness evidence currently proves an EMPTY database only. Re-read it before
// applying; this command never mutates cloud resources or infers unseen schemas.
const source = process.argv[2];
assert.ok(source, 'Usage: npm run plan:db:p0 -- <empty-database-readiness.json>');
const evidence = JSON.parse(await readFile(source, 'utf8'));
const mapping = JSON.parse(await readFile('config/environments.local.json', 'utf8'));
assert.equal(evidence.envId, mapping.development.envId);
assert.equal(evidence.appId, mapping.development.appId);
assert.notEqual(evidence.envId, mapping.production?.envId);
assert.equal(evidence.associated, true);
assert.equal(evidence.databaseType, 'NoSQL');
assert.deepEqual(evidence.collections, [], 'Non-empty database requires fresh normalized collection, index and permission snapshots');
assert.equal(typeof evidence.collectionsRequestId, 'string');
await mkdir('.local/p0', { recursive: true });
const modulePath = resolve('.local/p0/database-setup.mjs');
await build({ entryPoints: ['packages/cloudbase/src/database-setup.ts'], outfile: modulePath, bundle: true, platform: 'node', format: 'esm', target: 'node22' });
const { planP0DatabaseSetup, p0DatabaseSchema } = await import(pathToFileURL(modulePath).href);
const plan = { mode: 'preview-only', schemaVersion: p0DatabaseSchema.version, envId: evidence.envId, appId: evidence.appId,
  observedAt: evidence.checkedAt, sourceRequestId: evidence.collectionsRequestId,
  operations: planP0DatabaseSetup([]), requiresFreshReadBeforeApply: true,
  dataWriteGate: 'Client read/write denial must be applied and verified before seeding; permission tooling must be confirmed separately.' };
await writeFile('.local/p0/database-setup-plan.json', JSON.stringify(plan, null, 2) + '\n');
console.log(JSON.stringify(plan, null, 2));
