import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import semanticRelease from 'semantic-release';
import { analyzeCommits } from '@semantic-release/commit-analyzer';
import { prepare, publish, verifyConditions } from './workspace.mjs';
import releaseConfig from '../../release.config.mjs';

const logger = { log() {}, error() {}, success() {} };

const fixture = async (t, isPrivate = true) => {
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
      }),
    );
  }
  return {
    cwd,
    env: { ...process.env, NUMIOR_RELEASE_ENABLED: 'false' },
    logger,
    options: { dryRun: false, repositoryUrl: 'https://github.com/example/numior-ui.git' },
    nextRelease: { version: '1.0.0' },
  };
};

test('conventional commits produce patch, minor, major and no release', async () => {
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

test('disabled and private packages cannot reach prepare or publish', async (t) => {
  const context = await fixture(t);
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

test('packing synchronizes versions and replaces workspace protocols without publishing', async (t) => {
  const context = await fixture(t, false);
  context.env.NUMIOR_RELEASE_ENABLED = 'true';
  context.options.repositoryUrl =
    'https://x-access-token:fixture-secret@github.com/example/numior-ui.git';
  execFileSync('pnpm', ['install', '--offline', '--ignore-scripts'], {
    cwd: context.cwd,
    env: context.env,
    encoding: 'utf8',
  });
  await prepare({}, context);
  const tarball = join(context.cwd, '.release/numior-vue-1.0.0.tgz');
  const packed = JSON.parse(
    execFileSync('tar', ['-xOf', tarball, 'package/package.json'], { encoding: 'utf8' }),
  );
  assert.equal(packed.version, '1.0.0');
  assert.equal(packed.peerDependencies['@numior/tokens'], '1.0.0');
  assert.equal(packed.repository.url, 'https://github.com/example/numior-ui.git');
  assert.ok(!JSON.stringify(packed).includes('fixture-secret'));
  assert.equal(packed.repository.directory, 'packages/vue');
  assert.equal(
    execFileSync('tar', ['-xOf', tarball, 'package/dist/LICENSE'], { encoding: 'utf8' }),
    'MIT fixture',
  );
  assert.equal(JSON.parse(await readFile(join(context.cwd, 'package.json'), 'utf8')).private, true);
});

test('prerelease versions are rejected before changing package versions', async (t) => {
  const context = await fixture(t, false);
  context.env.NUMIOR_RELEASE_ENABLED = 'true';
  context.nextRelease.version = '1.0.0-beta.1';
  await assert.rejects(prepare({}, context), /Only stable releases/);
  assert.equal(
    JSON.parse(await readFile(join(context.cwd, 'packages/vue/package.json'), 'utf8')).version,
    '0.0.0',
  );
});

test('semantic-release calculates the first 1.0.0 in dry-run without tags or package mutations', async (t) => {
  const context = await fixture(t);
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
  git('commit', '-m', 'feat: initial foundation');
  git('remote', 'add', 'origin', remote);
  git('push', '-u', 'origin', 'master');
  const before = await readFile(join(context.cwd, 'packages/vue/package.json'), 'utf8');
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
  assert.equal(result.nextRelease.version, '1.0.0');
  assert.equal(git('tag', '--list'), '');
  assert.equal(await readFile(join(context.cwd, 'packages/vue/package.json'), 'utf8'), before);
});
