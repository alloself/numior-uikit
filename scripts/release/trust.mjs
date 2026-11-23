import { execFileSync } from 'node:child_process';
import { assertNpmAtLeast, packages } from './workspace-packages.mjs';

const TRUST_NPM = [11, 15, 0];

const WORKFLOW = 'ci.yml';

const GITHUB_REPOSITORY = /github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?$/u;

const read = (command, args) =>
  execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

const githubRepository = () => {
  const url = read('git', ['remote', 'get-url', 'origin']);
  const match = GITHUB_REPOSITORY.exec(url);

  if (match === null) {
    throw new Error(`origin ${url} is not a GitHub repository`);
  }
  return match[1];
};

const isPublished = (name) => {
  try {
    read('npm', ['view', name, 'version']);

    return true;
  } catch {
    return false;
  }
};

const dryRun = process.argv.includes('--dry-run');

assertNpmAtLeast(process.env, TRUST_NPM, 'configure Trusted Publishing');
read('npm', ['whoami']);

const repository = githubRepository();
const names = (await packages(process.cwd())).map(({ manifest }) => manifest.name);
const missing = names.filter((name) => !isPublished(name));

if (missing.length > 0) {
  throw new Error(`Publish the first alpha before binding: ${missing.join(', ')} not on npm`);
}

for (const name of names) {
  execFileSync(
    'npm',
    [
      'trust',
      'github',
      name,
      '--repo',
      repository,
      '--file',
      WORKFLOW,
      '--allow-publish',
      '--yes',
      ...(dryRun ? ['--dry-run'] : []),
    ],
    { stdio: 'inherit' },
  );
}

console.log(
  `${dryRun ? 'Checked' : 'Bound'} ${names.length} packages to ${repository} ${WORKFLOW}`,
);
