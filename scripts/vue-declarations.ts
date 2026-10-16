import { spawnSync } from 'node:child_process';
import { readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = 'node_modules/.cache/vue-dts';

rmSync(OUT_DIR, { recursive: true, force: true });

const run = spawnSync(
  'vue-tsc',
  [
    '-p',
    'tsconfig.json',
    '--noEmit',
    'false',
    '--declaration',
    '--emitDeclarationOnly',
    '--outDir',
    OUT_DIR,
  ],
  { stdio: 'inherit' },
);

if (run.error !== undefined) {
  throw run.error;
}

for (const entry of readdirSync(OUT_DIR, { recursive: true, withFileTypes: true })) {
  if (entry.isFile() && !entry.name.endsWith('.vue.d.ts')) {
    rmSync(join(entry.parentPath, entry.name));
  }
}

process.exitCode = run.status ?? 1;
