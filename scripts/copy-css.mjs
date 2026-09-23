import { cp, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const name = process.argv[2];
if (!['tokens', 'utilities', 'tailwind'].includes(name)) {
  throw new Error('Unknown CSS workspace');
}
const root = resolve('packages', name);
await mkdir(`${root}/dist`, { recursive: true });
await cp(`${root}/src`, `${root}/dist`, { recursive: true });
await cp('LICENSE', `${root}/dist/LICENSE`);
