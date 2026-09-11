import { spawnSync } from 'node:child_process';
for (const script of ['lint', 'typecheck', 'build', 'test:unit']) {
  const result = spawnSync('npm', ['run', script], { stdio: 'inherit' });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
