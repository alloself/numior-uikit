import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { assertNpmAtLeast, packages } from './workspace-packages.mjs';

const repositoryUrl = (options) => {
  // semantic-release rewrites repositoryUrl to an authenticated push URL.
  // Only a credential-free URL may enter published package metadata.
  const source = options.originalRepositoryURL ?? options.repositoryUrl;
  assert.ok(source, 'A real repository URL is required for package provenance');
  const parsed = new URL(source.replace(/^git\+/, '').replace(/^git@([^:]+):/, 'https://$1/'));
  assert.ok(['https:', 'ssh:'].includes(parsed.protocol), 'Expected an HTTPS or SSH repository');
  return `https://${parsed.host}${parsed.pathname}`;
};

const PRERELEASE = /\d+\.\d+\.\d+-[0-9A-Za-z.-]+/;

const ALPHA = /^1\.0\.0-alpha\.[1-9]\d*$/;

const OIDC_NPM = [11, 5, 1];

const assertStableDependencies = (manifest) => {
  for (const [name, range] of Object.entries({
    ...manifest.dependencies,
    ...manifest.peerDependencies,
  })) {
    assert.doesNotMatch(
      String(range),
      PRERELEASE,
      `${manifest.name} has a prerelease dependency ${name}@${range}`,
    );
  }
};

export const verifyConditions = async (_config, context) => {
  const libraries = await packages(context.cwd);
  if (context.options?.dryRun) {
    return;
  }

  assert.equal(
    context.env.NUMIOR_RELEASE_ENABLED,
    'true',
    'Releases are disabled until NUMIOR_RELEASE_ENABLED is true',
  );

  assertNpmAtLeast(context.env, OIDC_NPM, 'publish through Trusted Publishing');

  for (const { manifest } of libraries) {
    assert.equal(manifest.private, false, `${manifest.name} is not approved for publication`);
    assertStableDependencies(manifest);
  }
};

export const prepare = async (config, context) => {
  // Defense in depth: a direct hook call must not bypass the publication gate.
  assert.ok(!context.options?.dryRun, 'prepare must not run during a dry run');
  await verifyConditions(config, context);
  const version = context.nextRelease.version;
  const repository = repositoryUrl(context.options);

  assert.match(version, ALPHA, 'Only 1.0.0-alpha prereleases are published before 1.0');

  const libraries = await packages(context.cwd);
  const destination = resolve(context.cwd, '.release');
  await mkdir(destination, { recursive: true });
  // Update every manifest before packing, so workspace:* references resolve consistently.
  for (const library of libraries) {
    library.manifest.version = version;

    library.manifest.repository = {
      type: 'git',
      url: repository,
      directory: relative(context.cwd, library.directory).replaceAll('\\', '/'),
    };

    await writeFile(library.path, `${JSON.stringify(library.manifest, null, 2)}\n`);
  }
  for (const { directory } of libraries) {
    await access(join(directory, 'dist/LICENSE'));

    execFileSync('pnpm', ['pack', '--pack-destination', destination], {
      cwd: directory,
      env: context.env,
      stdio: 'pipe',
      encoding: 'utf8',
    });
  }
  context.logger.log('Prepared %d workspace packages at %s', libraries.length, version);
};

export const publish = async (config, context) => {
  assert.ok(!context.options?.dryRun, 'publish must not run during a dry run');
  await verifyConditions(config, context);
  for (const { manifest } of await packages(context.cwd)) {
    assert.equal(
      manifest.version,
      context.nextRelease.version,
      'Package was not prepared for this release',
    );

    const filename = `${manifest.name.slice(1).replace('/', '-')}-${manifest.version}.tgz`;
    const tarball = join(context.cwd, '.release', filename);
    await access(tarball);

    execFileSync(
      'npm',
      ['publish', tarball, '--access', 'public', '--provenance', '--tag', 'latest'],
      {
        cwd: context.cwd,
        env: context.env,
        stdio: 'pipe',
        encoding: 'utf8',
      },
    );

    context.logger.log('Published %s@%s', manifest.name, manifest.version);
  }
  return { name: 'Numior UI workspace packages' };
};
