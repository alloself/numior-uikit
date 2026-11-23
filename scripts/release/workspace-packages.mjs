import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

export const packages = async (cwd) => {
  const entries = await readdir(join(cwd, 'packages'), { withFileTypes: true });
  const result = [];
  for (const entry of entries.filter((item) => item.isDirectory())) {
    const directory = join(cwd, 'packages', entry.name);
    const path = join(directory, 'package.json');
    const manifest = JSON.parse(await readFile(path, 'utf8'));
    assert.match(manifest.name, /^@numior\/[a-z0-9-]+$/, 'Unexpected release package');
    result.push({ directory, path, manifest });
  }
  assert.ok(result.length > 0, 'No library packages found');
  assert.equal(new Set(result.map(({ manifest }) => manifest.name)).size, result.length);
  return result;
};

export const assertNpmAtLeast = (env, minimum, purpose) => {
  const version = execFileSync('npm', ['--version'], { env, encoding: 'utf8' }).trim();
  const parts = version.split('.').map(Number);
  const index = minimum.findIndex((part, position) => parts[position] !== part);

  assert.ok(
    index === -1 || parts[index] > minimum[index],
    `npm ${version} cannot ${purpose}; ${minimum.join('.')} or newer is required`,
  );
};
