import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

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
const PRERELEASE_FLOOR = /^>=\d+\.\d+\.\d+-[0-9A-Za-z.-]+ <\d+\.\d+\.\d+$/;

const optionalPeers = (manifest) =>
  new Set(
    Object.entries({ ...manifest.peerDependenciesMeta })
      .filter(([, meta]) => meta.optional === true)
      .map(([name]) => name),
  );

const assertStable = (manifest, name, range) => {
  assert.doesNotMatch(
    String(range),
    PRERELEASE,
    `${manifest.name} has a prerelease dependency ${name}@${range}`,
  );
};

const packages = async (cwd) => {
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

const isPrereleaseFloor = (floors, name, range) =>
  floors.has(name) && PRERELEASE_FLOOR.test(String(range));

const assertStablePeers = (manifest, floors) => {
  for (const [name, range] of Object.entries({ ...manifest.peerDependencies })) {
    if (!isPrereleaseFloor(floors, name, range)) {
      assertStable(manifest, name, range);
    }
  }
};

const assertStableDependencies = (manifest) => {
  for (const [name, range] of Object.entries({ ...manifest.dependencies })) {
    assertStable(manifest, name, range);
  }
  assertStablePeers(manifest, optionalPeers(manifest));
};

export const verifyConditions = async (_config, context) => {
  const libraries = await packages(context.cwd);
  if (context.options?.dryRun) {
    return;
  }

  assert.equal(
    context.env.NUMIOR_RELEASE_ENABLED,
    'true',
    'Public releases are disabled until 1.0 readiness',
  );

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

  assert.match(
    version,
    /^[1-9]\d*\.\d+\.\d+$/,
    'Only stable releases starting at 1.0.0 are supported',
  );

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
