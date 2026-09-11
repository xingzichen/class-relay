import { mkdir, readFile, writeFile, rm, readdir, copyFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
const stage = process.env.APP_STAGE ?? 'development';
if (!['development', 'production'].includes(stage)) throw new Error('Invalid APP_STAGE');
await mkdir('dist/tools', { recursive: true });
await build({ entryPoints: ['packages/contracts/src/config.ts'], outfile: 'dist/tools/config.mjs', bundle: true, platform: 'node', format: 'esm', target: 'node22' });
const { resolveConfig } = await import(pathToFileURL(join(process.cwd(), 'dist/tools/config.mjs')).href);
let config = null;
try {
  const mapping = JSON.parse(await readFile('config/environments.local.json', 'utf8'));
  config = resolveConfig(stage, mapping);
} catch (error) {
  if (error.code !== 'ENOENT' || stage === 'production') throw error;
  console.log('Development artifact only: waiting for a real AppID; cloud initialization and IDE launch are unavailable.');
}
for (const dir of ['dist/miniprogram', 'dist/functions']) await rm(dir, { recursive: true, force: true });
await mkdir('dist/miniprogram', { recursive: true });
async function copyAssets(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await copyAssets(path);
    else if (/\.(json|wxml|wxss)$/.test(path)) {
      const target = path.replace('miniprogram/src', 'dist/miniprogram');
      await mkdir(dirname(target), { recursive: true }); await copyFile(path, target);
    }
  }
}
await copyAssets('miniprogram/src');
await build({ entryPoints: ['miniprogram/src/app.ts','miniprogram/src/pages/index/index.ts'], outbase: 'miniprogram/src', outdir: 'dist/miniprogram', bundle: true, platform: 'browser', format: 'cjs', target: 'es2020', define: { __PUBLIC_CONFIG__: JSON.stringify(config) } });
const functions = ['bootstrap', ...(stage === 'development' ? ['p0Identity', 'p0Internal'] : [])];
for (const name of functions) {
  await build({ entryPoints: [`functions/${name}/src/index.ts`], outfile: `dist/functions/${name}/index.js`, bundle: true, platform: 'node', format: 'cjs', target: 'node22', packages: 'external' });
  await copyFile(`functions/${name}/package.json`, `dist/functions/${name}/package.json`);
  if (name === 'p0Identity') await copyFile(`functions/${name}/package-lock.json`, `dist/functions/${name}/package-lock.json`);
}
const project = JSON.parse(await readFile('project.config.json', 'utf8'));
await writeFile('dist/project.config.json', JSON.stringify({ ...project, appid: config?.appId ?? '', miniprogramRoot: 'miniprogram/', cloudfunctionRoot: 'functions/' }, null, 2) + '\n');
console.log(`Build complete (${stage}). ${config ? 'Import dist/ in WeChat DevTools.' : 'Configure a real AppID before importing dist/.'} No resources deployed.`);
