import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const script = fileURLToPath(new URL('./trust.mjs', import.meta.url));

const FAKE_NPM = `#!/bin/sh
echo "$*" >> "$NPM_LOG"
case "$1" in
  --version) echo "$FAKE_NPM_VERSION" ;;
  whoami) echo owner ;;
  view) [ "$2" = "$FAKE_NPM_MISSING" ] && exit 1; echo 1.0.0-alpha.1 ;;
esac
`;

const workspace = async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), 'numior-trust-'));
  t.after(() => rm(cwd, { recursive: true, force: true }));

  for (const name of ['tokens', 'vue']) {
    await mkdir(join(cwd, 'packages', name), { recursive: true });

    await writeFile(
      join(cwd, 'packages', name, 'package.json'),
      JSON.stringify({ name: `@numior/${name}`, version: '0.0.0' }),
    );
  }

  const bin = join(cwd, 'bin');
  await mkdir(bin);
  await writeFile(join(bin, 'npm'), FAKE_NPM, { mode: 0o755 });
  execFileSync('git', ['init', '--quiet'], { cwd });

  execFileSync('git', ['remote', 'add', 'origin', 'git@github.com:example/numior-ui.git'], {
    cwd,
  });

  const log = join(cwd, 'npm.log');

  const run = (env, ...args) =>
    spawnSync(process.execPath, [script, ...args], {
      cwd,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${bin}${delimiter}${process.env.PATH}`,
        NPM_LOG: log,
        FAKE_NPM_VERSION: '11.19.0',
        FAKE_NPM_MISSING: '',
        ...env,
      },
    });

  const calls = async () =>
    (await readFile(log, 'utf8').catch(() => '')).split('\n').filter((line) => line !== '');

  return { run, calls };
};

await test('every package is bound to the ci workflow of the origin repository', async (t) => {
  const { run, calls } = await workspace(t);

  const result = run({}, '--dry-run');

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Checked 2 packages to example\/numior-ui ci\.yml/);

  assert.deepEqual(
    (await calls()).filter((line) => line.startsWith('trust')),
    ['@numior/tokens', '@numior/vue'].map(
      (name) =>
        `trust github ${name} --repo example/numior-ui --file ci.yml --allow-publish --yes --dry-run`,
    ),
  );
});

await test('an unpublished package stops the binding before any trust call', async (t) => {
  const { run, calls } = await workspace(t);

  const result = run({ FAKE_NPM_MISSING: '@numior/vue' });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Publish the first alpha before binding: @numior\/vue/);
  assert.ok(!(await calls()).some((line) => line.startsWith('trust')));
});

await test('an npm without the trust command stops the binding', async (t) => {
  const { run, calls } = await workspace(t);

  const result = run({ FAKE_NPM_VERSION: '11.14.2' });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /cannot configure Trusted Publishing; 11\.15\.0 or newer/);
  assert.deepEqual(await calls(), ['--version']);
});
