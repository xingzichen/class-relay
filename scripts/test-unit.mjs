import { readdir, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--coverage')) throw new Error('Unsupported test argument');
async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (path.endsWith('.test.ts')) files.push(path);
  }
  return files.sort();
}
const files = await walk('tests/unit');
if (!files.length) throw new Error('No unit tests found');
await rm('dist/tests', { recursive: true, force: true });
await mkdir('dist/tests', { recursive: true });
await build({ entryPoints: files, outbase: 'tests/unit', outdir: 'dist/tests', outExtension: { '.js': '.cjs' }, bundle: true, platform: 'node', target: 'node22', format: 'cjs', sourcemap: 'inline', packages: 'external' });
const outputs = files.map(file => file.replace('tests/unit/', 'dist/tests/').replace(/\.ts$/, '.cjs'));
const result = spawnSync(process.execPath, ['--enable-source-maps', '--test', '--test-reporter=spec', ...(args.includes('--coverage') ? ['--experimental-test-coverage'] : []), ...outputs], { stdio: 'inherit' });
if (result.error || result.status !== 0) process.exit(result.status || 1);
