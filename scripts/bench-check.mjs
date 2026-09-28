import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [, , pkg] = process.argv;

if (!pkg) {
  console.error('usage: node scripts/bench-check.mjs <package>');
  process.exit(1);
}

const dir = resolve(`packages/${pkg}/bench/results`);
const files = (await readdir(dir)).filter((name) => name.endsWith('.json')).toSorted();

const thresholds = JSON.parse(
  await readFile(resolve(`packages/${pkg}/bench/thresholds.json`), 'utf8'),
);

const suites = Object.keys(thresholds);

const suffixed = (name) =>
  suites.some((suite) => suite !== 'node' && name.endsWith(`-${suite}.json`));

const suiteFile = (suite) =>
  files
    .filter((name) => (suite === 'node' ? !suffixed(name) : name.endsWith(`-${suite}.json`)))
    .at(-1);

const failures = [];
let checked = 0;

for (const [suite, limits] of Object.entries(thresholds)) {
  const latest = suiteFile(suite);

  if (!latest) {
    failures.push(`${suite}: no results in ${dir}`);
    continue;
  }
  const record = JSON.parse(await readFile(resolve(dir, latest), 'utf8'));

  for (const [name, limit] of Object.entries(limits)) {
    const operation = record.operations.find((entry) => entry.name === name);
    checked += 1;

    if (!operation) {
      failures.push(`${suite} / ${name}: missing from ${latest}`);
      continue;
    }
    if (typeof limit.p95Ms === 'number' && operation.p95Ms > limit.p95Ms) {
      failures.push(
        `${suite} / ${name}: p95 ${operation.p95Ms.toFixed(1)} ms exceeds ${limit.p95Ms} ms`,
      );
    }
    if (typeof limit.maxMs === 'number' && operation.maxMs > limit.maxMs) {
      failures.push(
        `${suite} / ${name}: max ${operation.maxMs.toFixed(1)} ms exceeds ${limit.maxMs} ms`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error(`bench: thresholds broken\n  ${failures.join('\n  ')}`);
  process.exit(1);
}

console.log(
  `bench: ${checked} operations within thresholds (${Object.keys(thresholds).join(', ')})`,
);
