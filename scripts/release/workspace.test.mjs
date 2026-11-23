import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { PassThrough } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import semanticRelease from 'semantic-release';
import { analyzeCommits } from '@semantic-release/commit-analyzer';
import { prepare, publish, verifyConditions } from './workspace.mjs';
import releaseConfig from '../../release.config.mjs';

const logger = { log() {}, error() {}, success() {} };

const fixture = async (t, isPrivate, dependencies) => {
  const cwd = await mkdtemp(join(tmpdir(), 'numior-release-'));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  await writeFile(join(cwd, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');

  await writeFile(
    join(cwd, 'package.json'),
    JSON.stringify({ private: true, packageManager: 'pnpm@10.31.0' }),
  );

  for (const name of ['tokens', 'vue']) {
    const directory = join(cwd, 'packages', name);
    await mkdir(join(directory, 'dist'), { recursive: true });
    await writeFile(join(directory, 'dist/LICENSE'), 'MIT fixture');
    await writeFile(join(directory, 'dist/index.js'), 'export const ready = true;');

    await writeFile(
      join(directory, 'package.json'),
      JSON.stringify({
        name: `@numior/${name}`,
        version: '0.0.0',
        private: isPrivate,
        files: ['dist'],
        ...(name === 'vue' ? { peerDependencies: { '@numior/tokens': 'workspace:*' } } : {}),
        ...(name === 'vue' ? { dependencies } : {}),
      }),
    );
  }
  return {
    cwd,
    env: { ...process.env, NUMIOR_RELEASE_ENABLED: 'false' },
    logger,
    options: { dryRun: false, repositoryUrl: 'https://github.com/example/numior-ui.git' },
    nextRelease: { version: '1.0.0-alpha.1' },
  };
};

await test('conventional commits produce patch, minor, major and no release', async () => {
  const [, options] = releaseConfig.plugins[0];
  for (const [message, expected] of [
    ['fix(vue): prevent duplicate submission', 'patch'],
    ['feat(tokens): add semantic roles', 'minor'],
    ['feat(vue)!: replace button props', 'major'],
    ['fix(forms): change validation\n\nBREAKING CHANGE: validation returns a promise', 'major'],
    ['docs: update guide', null],
    ['chore: update tooling', null],
  ]) {
    assert.equal(
      await analyzeCommits(options, { cwd: process.cwd(), commits: [{ message }], logger }),
      expected,
    );
  }
});

await test('disabled and private packages cannot reach prepare or publish', async (t) => {
  const context = await fixture(t, true, {});
  await assert.rejects(verifyConditions({}, context), /disabled/);
  await assert.rejects(prepare({}, context), /disabled/);
  await assert.rejects(publish({}, context), /disabled/);
  context.env.NUMIOR_RELEASE_ENABLED = 'true';
  await assert.rejects(verifyConditions({}, context), /not approved/);
  const before = await readFile(join(context.cwd, 'packages/vue/package.json'), 'utf8');
  await verifyConditions({}, { ...context, options: { dryRun: true } });
  await assert.rejects(prepare({}, { ...context, options: { dryRun: true } }), /dry run/);
  assert.equal(await readFile(join(context.cwd, 'packages/vue/package.json'), 'utf8'), before);
});

await test('packing synchronizes versions and replaces workspace protocols without publishing', async (t) => {
  const context = await fixture(t, false, {});
  context.env.NUMIOR_RELEASE_ENABLED = 'true';

  context.options.repositoryUrl =
    'https://x-access-token:fixture-secret@github.com/example/numior-ui.git';

  execFileSync('pnpm', ['install', '--offline', '--ignore-scripts'], {
    cwd: context.cwd,
    env: context.env,
    encoding: 'utf8',
  });

  await prepare({}, context);
  const tarball = join(context.cwd, '.release/numior-vue-1.0.0-alpha.1.tgz');

  const packed = JSON.parse(
    execFileSync('tar', ['-xOf', tarball, 'package/package.json'], { encoding: 'utf8' }),
  );

  assert.equal(packed.version, '1.0.0-alpha.1');
  assert.equal(packed.peerDependencies['@numior/tokens'], '1.0.0-alpha.1');
  assert.equal(packed.repository.url, 'https://github.com/example/numior-ui.git');
  assert.ok(!JSON.stringify(packed).includes('fixture-secret'));
  assert.equal(packed.repository.directory, 'packages/vue');

  assert.equal(
    execFileSync('tar', ['-xOf', tarball, 'package/dist/LICENSE'], { encoding: 'utf8' }),
    'MIT fixture',
  );

  assert.equal(JSON.parse(await readFile(join(context.cwd, 'package.json'), 'utf8')).private, true);
});

await test('a prerelease dependency blocks publication but not a dry run', async (t) => {
  const context = await fixture(t, false, { 'vee-validate': '5.0.0-beta.1' });
  context.env.NUMIOR_RELEASE_ENABLED = 'true';

  await assert.rejects(
    verifyConditions({}, context),
    /prerelease dependency vee-validate@5\.0\.0-beta\.1/,
  );

  await assert.rejects(prepare({}, context), /prerelease dependency/);
  await verifyConditions({}, { ...context, options: { dryRun: true } });
});

await test('only 1.0.0 alphas reach the package versions', async (t) => {
  const context = await fixture(t, false, {});
  context.env.NUMIOR_RELEASE_ENABLED = 'true';

  for (const version of ['1.0.0', '1.0.0-beta.1', '2.0.0-alpha.1', '1.1.0-alpha.1']) {
    context.nextRelease.version = version;
    await assert.rejects(prepare({}, context), /Only 1\.0\.0-alpha prereleases/);
  }

  assert.equal(
    JSON.parse(await readFile(join(context.cwd, 'packages/vue/package.json'), 'utf8')).version,
    '0.0.0',
  );
});

await test('an npm without Trusted Publishing blocks the release', async (t) => {
  const context = await fixture(t, false, {});
  const bin = join(context.cwd, 'bin');
  await mkdir(bin);
  context.env.NUMIOR_RELEASE_ENABLED = 'true';
  context.env.PATH = `${bin}${delimiter}${context.env.PATH}`;

  for (const [version, accepted] of [
    ['11.5.0', false],
    ['10.9.2', false],
    ['11.5.1', true],
    ['11.10.0', true],
    ['12.0.0', true],
  ]) {
    await writeFile(join(bin, 'npm'), `#!/bin/sh\necho ${version}\n`, { mode: 0o755 });

    if (accepted) {
      await verifyConditions({}, context);
      continue;
    }
    await assert.rejects(verifyConditions({}, context), /Trusted Publishing/);
  }
});

await test('semantic-release keeps every master release on 1.0.0 alphas in dry-run', async (t) => {
  const context = await fixture(t, true, {});

  const git = (...args) =>
    execFileSync('git', args, {
      cwd: context.cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

  const remote = join(context.cwd, 'remote.git');
  git('init', '--bare', remote);
  git('init');
  git('symbolic-ref', 'HEAD', 'refs/heads/master');
  git('config', 'user.name', 'Release fixture');
  git('config', 'user.email', 'release@example.invalid');
  git('add', 'packages', 'package.json', 'pnpm-workspace.yaml');
  git('commit', '-m', 'chore: initial foundation');
  git('remote', 'add', 'origin', remote);
  git('push', '-u', 'origin', 'master', 'master:stable');
  git('commit', '--allow-empty', '-m', 'feat: first components');
  git('push', 'origin', 'master');
  const before = await readFile(join(context.cwd, 'packages/vue/package.json'), 'utf8');

  const dryRun = async () => {
    const result = await semanticRelease(
      {
        ...releaseConfig,
        repositoryUrl: `file://${remote}`,
        plugins: [
          ...releaseConfig.plugins.slice(0, 2),
          fileURLToPath(new URL('./workspace.mjs', import.meta.url)),
        ],
        dryRun: true,
        ci: false,
      },
      { ...context, stdout: new PassThrough(), stderr: new PassThrough() },
    );

    return result.nextRelease.version;
  };

  assert.equal(await dryRun(), '1.0.0-alpha.1');
  assert.equal(git('tag', '--list'), '');
  assert.equal(await readFile(join(context.cwd, 'packages/vue/package.json'), 'utf8'), before);

  git('tag', 'v1.0.0-alpha.1');
  git('notes', '--ref', 'semantic-release-v1.0.0-alpha.1', 'add', '-m', '{"channels":["master"]}');
  git('push', 'origin', 'v1.0.0-alpha.1', 'refs/notes/*');

  for (const message of [
    'fix(vue): prevent duplicate submission',
    'feat(tokens): add semantic roles',
    'feat(vue)!: replace button props',
  ]) {
    git('commit', '--allow-empty', '-m', message);
    git('push', 'origin', 'master');

    assert.equal(await dryRun(), '1.0.0-alpha.2');
  }
});
